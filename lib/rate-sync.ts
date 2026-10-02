import "server-only";

import * as Sentry from "@sentry/nextjs";

import { addDays } from "@/lib/occupancy";
import type { PmsClient, PmsRateWindow, PmsReservation } from "@/lib/pms";
import {
  RATE_HORIZON_NIGHTS,
  aggregateNights,
  nightsFrom,
  todayIn,
  zonedMidnightUtc,
  type NightCharge,
  type NightPrice,
  type RateStay,
} from "@/lib/rate-math";
import { migrationApplied } from "@/lib/schema-features";
import { localDateOf } from "@/lib/stay-phase";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert } from "@/types/database";

/**
 * The rate cache's writer (B17). Runs at the end of every PMS sync, after the
 * reservations are stored, and keeps three things for the next 14 nights:
 *
 *   rooms sold and room revenue   every run — from the reservations this run
 *                                 fetched plus their charges (one or two PMS
 *                                 calls). ADR = revenue ÷ paid rooms.
 *   the lowest public price       about hourly — five kinds of PMS call
 *                                 (lib/mews.ts, lib/apaleo.ts), and prices
 *                                 move a few times a day, not every quarter.
 *   a snapshot                    once per hotel-local day, at the first run
 *                                 after midnight. Pickup is the difference
 *                                 between two of them.
 *
 * NEVER FAILS THE SYNC. Reservations are the product; rates are a line in the
 * brief. Any error here is reported to Sentry and the run carries on, and a
 * part that failed leaves its columns as they were rather than blanking them
 * — a PMS hiccup at 07:00 must not turn yesterday's numbers into "no rates".
 *
 * WRITES ONLY WHAT CHANGED, in the spirit of S3 (lib/mews-sync.ts): the 14
 * stored rows are read first and only rows whose numbers moved are upserted.
 *
 * NO GUEST DATA. Counts and money per night only, and the console line is
 * counts.
 */

/** How stale the selling price may get before a run checks it again. */
const SELLING_PRICE_MAX_AGE_MS = 55 * 60 * 1000;

const CANCELLED_STATE = "Canceled";

type RateNightRow = TablesInsert<"rate_nights">;

interface StoredNight {
  night: string;
  rooms_sold: number;
  priced_rooms: number | null;
  revenue_net: number | null;
  revenue_gross: number | null;
  sell_from_net: number | null;
  sell_from_gross: number | null;
  sell_from_checked_at: string | null;
  currency: string | null;
}

export interface RateSyncResult {
  skipped?: "migration" | "window" | "no-reservations-read";
  nightsWritten: number;
  snapshot: boolean;
  revenue: "ok" | "unsupported" | "failed" | "skipped";
  prices: "ok" | "unsupported" | "failed" | "fresh" | "skipped";
}

/** Postgres numeric comes back as a number from PostgREST; normalise anyway. */
function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Whether [windowStart, windowEnd] — the interval the reservations were
 * fetched for — covers the whole rate horizon. A manual sync with a narrower
 * `?from`/`?to` would otherwise undercount rooms on the nights it missed.
 */
function coversHorizon(
  tz: string,
  nights: string[],
  windowStart: Date,
  windowEnd: Date
): boolean {
  const first = zonedMidnightUtc(tz, nights[0]);
  const end = zonedMidnightUtc(tz, addDays(nights[nights.length - 1], 1));
  return windowStart.getTime() <= first.getTime() && windowEnd.getTime() >= end.getTime();
}

export async function syncRates(input: {
  hotelId: string;
  pms: PmsClient;
  /** Every reservation this run fetched, cancelled ones included. */
  reservations: PmsReservation[];
  windowStart: Date;
  windowEnd: Date;
  now?: Date;
}): Promise<RateSyncResult> {
  const { hotelId, pms, reservations } = input;
  const now = input.now ?? new Date();
  const result: RateSyncResult = {
    nightsWritten: 0,
    snapshot: false,
    revenue: "skipped",
    prices: "skipped",
  };

  if (!(await migrationApplied("0030"))) {
    return { ...result, skipped: "migration" };
  }

  const admin = createAdminClient();
  const { data: hotel, error: hotelError } = await admin
    .from("hotels")
    .select("timezone")
    .eq("id", hotelId)
    .single();
  if (hotelError || !hotel) throw new Error(`rates: hotel read failed`);

  const tz = hotel.timezone || "UTC";
  const today = todayIn(tz, now);
  const nights = nightsFrom(today, RATE_HORIZON_NIGHTS);
  if (!coversHorizon(tz, nights, input.windowStart, input.windowEnd)) {
    return { ...result, skipped: "window" };
  }
  const window: PmsRateWindow = { nights, timezone: tz };

  const stays: RateStay[] = reservations
    .filter((r) => r.State !== CANCELLED_STATE && r.StartUtc && r.EndUtc)
    .map((r) => ({
      id: r.Id,
      arrival: localDateOf(tz, r.StartUtc),
      departure: localDateOf(tz, r.EndUtc),
    }));
  const lastNight = nights[nights.length - 1];
  const inHorizon = stays.filter(
    (s) => s.arrival && s.departure && s.arrival <= lastNight && s.departure > nights[0]
  );

  // The stored rows, today's snapshot (does it exist yet?) and the charges,
  // all at once.
  const [stored, snapshotToday, charges] = await Promise.all([
    admin
      .from("rate_nights")
      .select(
        "night, rooms_sold, priced_rooms, revenue_net, revenue_gross, sell_from_net, sell_from_gross, sell_from_checked_at, currency"
      )
      .eq("hotel_id", hotelId)
      .gte("night", nights[0])
      .lte("night", lastNight),
    admin
      .from("rate_snapshots")
      .select("night", { count: "exact", head: true })
      .eq("hotel_id", hotelId)
      .eq("as_of", today),
    // null = the source has no charges; undefined = the call failed.
    (async (): Promise<NightCharge[] | null | undefined> => {
      if (!pms.getNightCharges) return null;
      if (inHorizon.length === 0) return [];
      try {
        return await pms.getNightCharges(
          inHorizon.map((s) => s.id),
          window
        );
      } catch (err) {
        Sentry.captureException(err, { tags: { hotelId, stage: "rates.revenue" } });
        return undefined;
      }
    })(),
  ]);
  if (stored.error) throw new Error(`rates: stored read failed: ${stored.error.message}`);

  const storedByNight = new Map(
    ((stored.data ?? []) as StoredNight[]).map((r) => [r.night, r])
  );

  // Selling price: only when the stored one is missing or about an hour old.
  let prices: NightPrice[] | null | undefined = undefined;
  if (!pms.getSellingPrices) {
    prices = null;
    result.prices = "unsupported";
  } else {
    const checks = nights.map(
      (n) => storedByNight.get(n)?.sell_from_checked_at ?? null
    );
    const oldest = checks.some((c) => !c)
      ? 0
      : Math.min(...checks.map((c) => new Date(c!).getTime()));
    if (now.getTime() - oldest >= SELLING_PRICE_MAX_AGE_MS) {
      try {
        prices = await pms.getSellingPrices(window);
        result.prices = "ok";
      } catch (err) {
        Sentry.captureException(err, { tags: { hotelId, stage: "rates.prices" } });
        result.prices = "failed";
      }
    } else {
      result.prices = "fresh";
    }
  }
  result.revenue =
    charges === null ? "unsupported" : charges === undefined ? "failed" : "ok";

  // Revenue columns are written only when the charges are known (or known to
  // be absent); selling-price columns only when they were checked this run.
  // Every row in one upsert carries the same columns — PostgREST would
  // otherwise null the ones a row leaves out.
  const aggregated = aggregateNights(
    nights,
    inHorizon,
    charges === undefined ? null : charges
  );
  const priceByNight = new Map((prices ?? []).map((p) => [p.night, p]));
  const checkedAt = now.toISOString();

  const writes: RateNightRow[] = [];
  for (const night of aggregated) {
    const before = storedByNight.get(night.night);
    const row: RateNightRow = {
      hotel_id: hotelId,
      night: night.night,
      rooms_sold: night.roomsSold,
      updated_at: checkedAt,
    };
    let changed = !before || before.rooms_sold !== night.roomsSold;

    const price = priceByNight.get(night.night);
    if (charges !== undefined) {
      row.priced_rooms = night.pricedRooms;
      row.revenue_net = night.revenueNet;
      row.revenue_gross = night.revenueGross;
      changed ||=
        num(before?.priced_rooms) !== night.pricedRooms ||
        num(before?.revenue_net) !== night.revenueNet ||
        num(before?.revenue_gross) !== night.revenueGross;
    }
    if (prices !== undefined) {
      row.sell_from_net = price?.net ?? null;
      row.sell_from_gross = price?.gross ?? null;
      row.sell_from_checked_at = checkedAt;
      changed = true; // the check time moved, which is itself the news
    }
    if (charges !== undefined || prices !== undefined) {
      // The revenue's currency, else the price's, else what was stored.
      row.currency =
        night.currency ?? price?.currency ?? before?.currency ?? null;
    }
    if (changed) writes.push(row);
  }

  if (writes.length > 0) {
    const { error } = await admin
      .from("rate_nights")
      .upsert(writes, { onConflict: "hotel_id,night" });
    if (error) throw new Error(`rates: upsert failed: ${error.message}`);
  }
  result.nightsWritten = writes.length;

  // The day's snapshot, once. Built from what the cache now holds: this run's
  // numbers where it computed them, the stored ones where a part failed.
  if (!snapshotToday.error && (snapshotToday.count ?? 0) === 0) {
    const snapshot = aggregated.map((n) => {
      const before = storedByNight.get(n.night);
      const revenueKnown = charges !== undefined;
      return {
        hotel_id: hotelId,
        as_of: today,
        night: n.night,
        rooms_sold: n.roomsSold,
        priced_rooms: revenueKnown ? n.pricedRooms : num(before?.priced_rooms),
        revenue_net: revenueKnown ? n.revenueNet : num(before?.revenue_net),
        taken_at: checkedAt,
      };
    });
    const { error } = await admin
      .from("rate_snapshots")
      .upsert(snapshot, { onConflict: "hotel_id,as_of,night", ignoreDuplicates: true });
    if (error) throw new Error(`rates: snapshot failed: ${error.message}`);
    result.snapshot = true;
  }

  console.log(
    `[sync] rates ${result.nightsWritten} nights written; revenue ${result.revenue}; prices ${result.prices}; snapshot ${result.snapshot ? "taken" : "exists"}`
  );
  return result;
}
