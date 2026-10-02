import "server-only";

import {
  addDays,
  occupancyOutlook as buildOccupancyOutlook,
  occupancyPct,
  occupiedOn,
  type StayDates,
} from "@/lib/occupancy";
import {
  rawSelect,
  readNotes,
  readVip,
  withSlimRaw,
} from "@/lib/pms-fields";
import { loadRateOutlook } from "@/lib/rate-outlook";
import { localDate, localDateOf } from "@/lib/stay-phase";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/paged";
import type { Json } from "@/types/database";

/**
 * Builds a structured snapshot of a hotel's current state for the "Ask Your
 * Hotel" chat. Reads ONLY cached Supabase data (never the PMS API directly).
 *
 * Token budget: arrays are capped (today > this week > historical) so the
 * serialized object stays well under ~8k tokens.
 */

const OCCUPANCY_ALERT_HORIZON = 14;
const WEEK_HORIZON = 7;
const LOW_OCCUPANCY = 0.6;

// Conservative caps to bound the serialized size.
const CAP_WEEK_RESERVATIONS = 60;
const CAP_LIST = 40;

export interface HotelContext {
  hotel: { name: string; timezone: string; rooms: number; date: string };
  today: {
    arrivals: ArrivalSummary[];
    departures: { guest: string }[];
    inHouse: { guest: string }[];
    occupancyRate: number; // 0–100
  };
  thisWeek: {
    reservations: WeekReservation[];
    occupancyByDay: Record<string, number>; // date -> 0–100
  };
  guests: {
    vipArrivals: ArrivalSummary[];
    specialRequests: { guest: string; request: string }[];
    missingArrivalTimes: { guest: string; arrival: string }[];
  };
  emails: {
    pendingCount: number;
    urgentCount: number;
    classifications: Record<string, number>;
  };
  rates: {
    occupancyAlerts: { date: string; occupancyRate: number }[];
    /**
     * The rate cache (B17), per night, when there is one: what the rooms
     * already sold pay on average, the lowest public price still on sale,
     * and yesterday's pickup. Money excl. VAT. Absent before migration 0030
     * or the first sync after it, so "what's our rate on Friday?" gets "I
     * don't have rates" rather than an invented number.
     */
    currency?: string | null;
    note?: string;
    nights?: {
      date: string;
      roomsSold: number;
      averageRate: number | null;
      sellingFrom: number | null;
      nothingOnSale: boolean;
      pickedUpYesterday: number | null;
    }[];
  };
  /**
   * Full per-day occupancy across the 14-day horizon. The dashboard computes
   * its own (lib/dashboard-snapshot.ts, RLS-scoped); this copy is what the chat
   * and the brief see, so "how full are we a week on Tuesday?" is answerable.
   */
  occupancyOutlook: { date: string; occupancyRate: number }[];
}

interface ArrivalSummary {
  guest: string;
  adults?: number;
  children?: number;
  vip: boolean;
}
interface WeekReservation {
  guest: string;
  checkIn: string;
  checkOut: string;
}

interface ReservationRow {
  mews_id: string;
  state: string | null;
  start_utc: string | null;
  end_utc: string | null;
  customer_mews_id: string | null;
  adult_count: number | null;
  child_count: number | null;
  arrival_time: string | null;
  raw: Json;
}

interface CustomerRow {
  mews_id: string;
  first_name: string | null;
  last_name: string | null;
  raw: Json;
}

// --- timezone helpers -------------------------------------------------------

function tzOffsetMs(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(
    dtf.formatToParts(date).map((x) => [x.type, x.value])
  );
  return (
    Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second)
    ) - date.getTime()
  );
}

function zonedMidnightUtc(tz: string, dateStr: string): Date {
  const naive = new Date(`${dateStr}T00:00:00Z`);
  return new Date(naive.getTime() - tzOffsetMs(tz, naive));
}

// --- guest data helpers -----------------------------------------------------

function pseudoName(first?: string | null, last?: string | null): string {
  const f = (first ?? "").trim();
  const initial = (last ?? "").trim() ? `${last!.trim()[0].toUpperCase()}.` : "";
  return [f, initial].filter(Boolean).join(" ") || "Guest";
}

// --- builder ----------------------------------------------------------------

/**
 * The live inbox counts. Needs only the hotel id, so it runs alongside the
 * reservation chain rather than after it (performance audit §4.8).
 */
async function loadEmailCounts(
  admin: ReturnType<typeof createAdminClient>,
  hotelId: string
): Promise<HotelContext["emails"]> {
  const { data: emailRows } = await admin
    .from("emails")
    .select("classification, status")
    .eq("hotel_id", hotelId)
    .in("status", ["pending", "needs_attention"])
    .limit(500);
  const classifications: Record<string, number> = {};
  let pendingCount = 0;
  let urgentCount = 0;
  for (const e of emailRows ?? []) {
    if (e.status === "pending") pendingCount++;
    if (e.status === "needs_attention") urgentCount++;
    if (e.classification) {
      classifications[e.classification] =
        (classifications[e.classification] ?? 0) + 1;
    }
  }
  return { pendingCount, urgentCount, classifications };
}

export async function buildHotelContext(hotelId: string): Promise<HotelContext> {
  const admin = createAdminClient();

  // Started now, awaited at the end: it doesn't depend on anything below.
  const emailCounts = loadEmailCounts(admin, hotelId);
  // A rejection is surfaced by the await below, not as an unhandled one while
  // the reservation chain is still running.
  emailCounts.catch(() => {});

  const { data: hotel } = await admin
    .from("hotels")
    .select("name, timezone, rooms_count")
    .eq("id", hotelId)
    .single();

  const tz = hotel?.timezone || "UTC";
  const rooms = hotel?.rooms_count ?? 0;
  const today = localDate(tz, new Date());

  // The rate cache needs only the date, so it reads alongside the
  // reservation chain below rather than after it.
  const rateRead = loadRateOutlook(admin, hotelId, today).catch(() => null);
  const todayStart = zonedMidnightUtc(tz, today);
  const todayEnd = zonedMidnightUtc(tz, addDays(today, 1));
  const horizonEnd = zonedMidnightUtc(tz, addDays(today, OCCUPANCY_ALERT_HORIZON));

  // Reservations overlapping [today, +14d], active only. Paged: a busy hotel
  // exceeds PostgREST's silent 1,000-row cap, which would understate occupancy
  // in the brief without any error to notice.
  //
  // Only the `raw` keys lib/pms-fields.ts reads — this runs before every Ask
  // answer, and the whole provider payload was most of its cost
  // (docs/audits/2026-10-01-performance.md §4.1, §4.8).
  const pagedRows = await fetchAllPages<ReservationRow>((from, to) =>
    admin
      .from("reservations")
      .select(
        `mews_id, state, start_utc, end_utc, customer_mews_id, adult_count, child_count, arrival_time, ${rawSelect("notes")}`
      )
      .eq("hotel_id", hotelId)
      .lt("start_utc", horizonEnd.toISOString())
      .gt("end_utc", todayStart.toISOString())
      // Unique within one hotel, so paging can't skip or repeat a row.
      .order("mews_id", { ascending: true })
      .range(from, to)
      .overrideTypes<ReservationRow[]>()
  );
  const reservationsRaw = withSlimRaw<ReservationRow>(pagedRows);

  const reservations = reservationsRaw.filter(
    (r) => r.state !== "Canceled" && r.start_utc && r.end_utc
  );

  // Guest profiles for these reservations, in chunks — the id list is as long
  // as the reservation list and would otherwise blow past the row cap and the
  // maximum URL length.
  const guestIds = [
    ...new Set(reservations.map((r) => r.customer_mews_id).filter(Boolean)),
  ] as string[];
  const guestById = new Map<
    string,
    { first_name: string | null; last_name: string | null; raw: Json }
  >();
  const customerRows = await fetchInChunks<CustomerRow>(guestIds, (chunk) =>
    admin
      .from("customers")
      .select(`mews_id, first_name, last_name, ${rawSelect("vip")}`)
      .eq("hotel_id", hotelId)
      .in("mews_id", chunk)
      .overrideTypes<CustomerRow[]>()
  );
  for (const c of withSlimRaw<CustomerRow>(customerRows)) {
    guestById.set(c.mews_id, c);
  }

  const nameOf = (customerMewsId: string | null) => {
    const c = customerMewsId ? guestById.get(customerMewsId) : undefined;
    return pseudoName(c?.first_name, c?.last_name);
  };
  const isVip = (customerMewsId: string | null) => {
    const c = customerMewsId ? guestById.get(customerMewsId) : undefined;
    return c ? readVip(c.raw) : false;
  };

  const inWindow = (iso: string, start: Date, end: Date) =>
    iso >= start.toISOString() && iso < end.toISOString();

  // Today.
  const arrivals: ArrivalSummary[] = reservations
    .filter((r) => inWindow(r.start_utc!, todayStart, todayEnd))
    .slice(0, CAP_LIST)
    .map((r) => ({
      guest: nameOf(r.customer_mews_id),
      adults: r.adult_count ?? undefined,
      children: r.child_count ?? undefined,
      vip: isVip(r.customer_mews_id),
    }));
  const departures = reservations
    .filter((r) => inWindow(r.end_utc!, todayStart, todayEnd))
    .slice(0, CAP_LIST)
    .map((r) => ({ guest: nameOf(r.customer_mews_id) }));
  const inHouse = reservations
    .filter(
      (r) =>
        r.start_utc! < todayStart.toISOString() &&
        r.end_utc! > todayEnd.toISOString()
    )
    .slice(0, CAP_LIST)
    .map((r) => ({ guest: nameOf(r.customer_mews_id) }));

  // Occupancy per day across the alert horizon. The rooms-sold-per-night rule
  // lives in lib/occupancy.ts so the dashboard and this brief can never
  // disagree about how full the hotel is.
  const stays: StayDates[] = reservations.map((r) => ({
    arrival: localDateOf(tz, r.start_utc),
    departure: localDateOf(tz, r.end_utc),
  }));

  const occupancyByDay: Record<string, number> = {};
  const occupancyAlerts: { date: string; occupancyRate: number }[] = [];
  const occupancyOutlook = buildOccupancyOutlook(
    stays,
    rooms,
    today,
    OCCUPANCY_ALERT_HORIZON
  ).map((d) => ({ date: d.date, occupancyRate: d.occupancyPct }));

  occupancyOutlook.forEach((day, i) => {
    if (i < WEEK_HORIZON) occupancyByDay[day.date] = day.occupancyRate;
    if (day.occupancyRate < LOW_OCCUPANCY * 100) occupancyAlerts.push(day);
  });

  // This week.
  const weekEnd = zonedMidnightUtc(tz, addDays(today, WEEK_HORIZON)).toISOString();
  const weekReservations: WeekReservation[] = reservations
    .filter((r) => r.start_utc! < weekEnd)
    .slice(0, CAP_WEEK_RESERVATIONS)
    .map((r) => ({
      guest: nameOf(r.customer_mews_id),
      checkIn: r.start_utc!,
      checkOut: r.end_utc!,
    }));

  // Guests of note (next 7 days).
  const upcoming = reservations.filter((r) => r.start_utc! < weekEnd);
  const vipArrivals = arrivals.filter((a) => a.vip);
  const specialRequests = upcoming
    .map((r) => ({ guest: nameOf(r.customer_mews_id), request: readNotes(r.raw) }))
    .filter((x): x is { guest: string; request: string } => Boolean(x.request))
    .slice(0, CAP_LIST);
  const missingArrivalTimes = upcoming
    .filter((r) => r.state === "Confirmed" && !r.arrival_time)
    .slice(0, CAP_LIST)
    .map((r) => ({ guest: nameOf(r.customer_mews_id), arrival: r.start_utc! }));

  const todayOccupied = occupiedOn(stays, today);

  const rateOutlook = await rateRead;
  const rateNights =
    rateOutlook && (rateOutlook.hasRevenue || rateOutlook.hasSellingPrice)
      ? {
          currency: rateOutlook.currency,
          note:
            "Per night: averageRate is the average room rate of the rooms already sold; sellingFrom is the lowest public price a guest booking today could get (an open public rate, in a room type with a room left); both exclude VAT. nothingOnSale is true when nothing is left to sell that night. pickedUpYesterday is rooms booked yesterday for that night, net of cancellations. null means unknown.",
          nights: rateOutlook.nights.map((night) => ({
            date: night.date,
            roomsSold: night.roomsSold,
            averageRate: night.adr,
            sellingFrom: night.sellFrom,
            nothingOnSale: night.nothingOnSale,
            pickedUpYesterday: night.pickupYesterday,
          })),
        }
      : {};

  return {
    hotel: { name: hotel?.name ?? "the hotel", timezone: tz, rooms, date: today },
    today: {
      arrivals,
      departures,
      inHouse,
      occupancyRate: occupancyPct(todayOccupied, rooms),
    },
    thisWeek: { reservations: weekReservations, occupancyByDay },
    guests: { vipArrivals, specialRequests, missingArrivalTimes },
    emails: await emailCounts,
    rates: { occupancyAlerts, ...rateNights },
    occupancyOutlook,
  };
}
