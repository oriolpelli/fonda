import "server-only";

import * as Sentry from "@sentry/nextjs";

import { addDays } from "@/lib/occupancy";
import type { PmsClient, PmsRateWindow, PmsReservation } from "@/lib/pms";
import {
  RATE_HORIZON_NIGHTS,
  aggregateNights,
  nightsFrom,
  planRateWrites,
  planSnapshot,
  todayIn,
  zonedMidnightUtc,
  type NightCharge,
  type NightPriceResult,
  type RateStay,
  type StoredNightFull,
} from "@/lib/rate-math";
import { migrationApplied } from "@/lib/schema-features";
import { localDateOf } from "@/lib/stay-phase";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The rate cache's writer (B17). Runs at the end of every PMS sync, after the
 * reservations are stored and the run is logged (lib/mews-sync.ts), and keeps
 * three things for the next 14 hotel-local nights:
 *
 *   rooms sold and room revenue   every run — from the reservations this run
 *                                 fetched plus their charges (one or two PMS
 *                                 calls). ADR = revenue ÷ paid rooms.
 *   the lowest public price       about hourly, counted from the last
 *                                 attempt — five kinds of PMS call
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
 * stored rows are read first and only rows whose numbers moved are upserted
 * (lib/rate-math.ts planRateWrites, which the fixture check covers).
 *
 * TIME-BOXED: charges 30 s, prices 60 s. The cron syncs hotels one after
 * another inside one function, so one slow PMS must not starve the next.
 *
 * NO GUEST DATA. Counts and money per night only, and the console line is
 * counts.
 */

/** How long after the last attempt a run asks for selling prices again. */
const SELLING_PRICE_RECHECK_MS = 55 * 60 * 1000;

/**
 * Time budgets. The rate step runs after the reservations are stored and
 * logged, but the cron syncs hotels one after another inside one function
 * (maxDuration 300 s), so a slow PMS here must not starve the next hotel.
 * A part that runs out of time counts as failed: its stored numbers stay.
 */
const CHARGES_BUDGET_MS = 30_000;
const PRICES_BUDGET_MS = 60_000;

class RateTimeout extends Error {}

function withBudget<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RateTimeout(`rates: ${what} took over ${ms / 1000}s`)), ms);
  });
  // A late rejection from `work` after the budget fired must not surface as
  // an unhandled rejection.
  work.catch(() => {});
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

const CANCELLED_STATE = "Canceled";

export interface RateSyncResult {
  skipped?: "migration" | "window" | "no-reservations-read";
  nightsWritten: number;
  snapshot: boolean;
  revenue: "ok" | "unsupported" | "failed" | "skipped";
  prices: "ok" | "unsupported" | "failed" | "fresh" | "skipped";
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
  const active = reservations.filter(
    (r) => r.State !== CANCELLED_STATE && r.StartUtc && r.EndUtc
  );
  const stays: (RateStay & { serviceId: string | null })[] = active.map((r) => ({
    id: r.Id,
    serviceId: r.ServiceId || null,
    arrival: localDateOf(tz, r.StartUtc),
    departure: localDateOf(tz, r.EndUtc),
  }));
  const lastNight = nights[nights.length - 1];
  const inHorizon = stays.filter(
    (s) => s.arrival && s.departure && s.arrival <= lastNight && s.departure > nights[0]
  );

  // The service most of the fortnight's stays belong to: the rooms. A MEWS
  // hotel may also sell parking as a "bookable" service, and its price must
  // never pass for the lowest room price.
  const serviceCounts = new Map<string, number>();
  for (const s of inHorizon) {
    if (s.serviceId) serviceCounts.set(s.serviceId, (serviceCounts.get(s.serviceId) ?? 0) + 1);
  }
  const roomService = [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const window: PmsRateWindow = {
    nights,
    timezone: tz,
    ...(roomService ? { serviceIds: [roomService] } : {}),
  };

  // The stored rows, today's snapshot (does it exist yet?) and the charges,
  // all at once.
  const [stored, snapshotToday, charges] = await Promise.all([
    admin
      .from("rate_nights")
      .select(
        "night, rooms_sold, priced_rooms, revenue_net, revenue_gross, sell_from_net, sell_from_gross, sell_from_checked_at, sell_from_attempted_at, currency"
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
        return await withBudget(
          pms.getNightCharges(
            inHorizon.map((s) => s.id),
            window
          ),
          CHARGES_BUDGET_MS,
          "charges"
        );
      } catch (err) {
        Sentry.captureException(err, { tags: { hotelId, stage: "rates.revenue" } });
        return undefined;
      }
    })(),
  ]);
  if (stored.error) throw new Error(`rates: stored read failed: ${stored.error.message}`);

  const storedByNight = new Map(
    ((stored.data ?? []) as StoredNightFull[]).map((r) => [r.night, r])
  );

  // Selling price: asked for about hourly, counted from the last ATTEMPT —
  // so a PMS that keeps failing (or an Apaleo connection without the scope)
  // is asked once an hour, not every 15 minutes.
  //   undefined  not asked this run, or the call failed: price columns
  //              untouched apart from the attempt time
  //   null       the source has no selling prices (Sheet): never written
  //   array      answered; a night missing from it is "can't tell"
  let prices: NightPriceResult[] | null | undefined = undefined;
  let attempted = false;
  if (!pms.getSellingPrices) {
    prices = null;
    result.prices = "unsupported";
  } else {
    const attempts = nights.map(
      (n) => storedByNight.get(n)?.sell_from_attempted_at ?? null
    );
    const lastAttempt = attempts.some((a) => !a)
      ? 0
      : Math.min(...attempts.map((a) => new Date(a!).getTime()));
    if (now.getTime() - lastAttempt >= SELLING_PRICE_RECHECK_MS) {
      attempted = true;
      try {
        prices = await withBudget(
          pms.getSellingPrices(window),
          PRICES_BUDGET_MS,
          "selling prices"
        );
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

  const aggregated = aggregateNights(
    nights,
    inHorizon,
    charges === undefined ? null : charges
  );
  const checkedAt = now.toISOString();
  const writes = planRateWrites({
    hotelId,
    aggregated,
    stored: storedByNight,
    charges,
    prices,
    attempted,
    at: checkedAt,
  });

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
    const { error } = await admin
      .from("rate_snapshots")
      .upsert(
        planSnapshot({
          hotelId,
          asOf: today,
          aggregated,
          stored: storedByNight,
          revenueKnown: charges !== undefined,
          at: checkedAt,
        }),
        { onConflict: "hotel_id,as_of,night", ignoreDuplicates: true }
      );
    if (error) throw new Error(`rates: snapshot failed: ${error.message}`);
    result.snapshot = true;
  }

  console.log(
    `[sync] rates ${result.nightsWritten} nights written; revenue ${result.revenue}; prices ${result.prices}; snapshot ${result.snapshot ? "taken" : "exists"}`
  );
  return result;
}
