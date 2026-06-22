import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
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
    currentRates: Record<string, never>; // rate plans aren't cached yet
    occupancyAlerts: { date: string; occupancyRate: number }[];
  };
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

function localDate(tz: string, instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function zonedMidnightUtc(tz: string, dateStr: string): Date {
  const naive = new Date(`${dateStr}T00:00:00Z`);
  return new Date(naive.getTime() - tzOffsetMs(tz, naive));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// --- guest data helpers -----------------------------------------------------

function pseudoName(first?: string | null, last?: string | null): string {
  const f = (first ?? "").trim();
  const initial = (last ?? "").trim() ? `${last!.trim()[0].toUpperCase()}.` : "";
  return [f, initial].filter(Boolean).join(" ") || "Guest";
}

function asObject(raw: Json): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

function readNotes(raw: Json): string | null {
  const r = asObject(raw);
  const note = r?.Notes ?? r?.notes;
  return typeof note === "string" && note.trim() ? note.trim() : null;
}

function readVip(raw: Json): boolean {
  const r = asObject(raw);
  if (!r) return false;
  if (typeof r.IsVip === "boolean") return r.IsVip;
  const c = r.Classifications;
  return (
    Array.isArray(c) &&
    c.some((x) => typeof x === "string" && x.toLowerCase().includes("vip"))
  );
}

const pct = (n: number) => Math.round(n * 100);

// --- builder ----------------------------------------------------------------

export async function buildHotelContext(hotelId: string): Promise<HotelContext> {
  const admin = createAdminClient();

  const { data: hotel } = await admin
    .from("hotels")
    .select("name, timezone, rooms_count")
    .eq("id", hotelId)
    .single();

  const tz = hotel?.timezone || "UTC";
  const rooms = hotel?.rooms_count ?? 0;
  const today = localDate(tz, new Date());
  const todayStart = zonedMidnightUtc(tz, today);
  const todayEnd = zonedMidnightUtc(tz, addDays(today, 1));
  const horizonEnd = zonedMidnightUtc(tz, addDays(today, OCCUPANCY_ALERT_HORIZON));

  // Reservations overlapping [today, +14d], active only.
  const { data: reservationsRaw } = await admin
    .from("reservations")
    .select(
      "mews_id, state, start_utc, end_utc, customer_mews_id, adult_count, child_count, arrival_time, raw"
    )
    .eq("hotel_id", hotelId)
    .lt("start_utc", horizonEnd.toISOString())
    .gt("end_utc", todayStart.toISOString());

  const reservations = (reservationsRaw ?? []).filter(
    (r) => r.state !== "Canceled" && r.start_utc && r.end_utc
  );

  // Guest profiles for these reservations.
  const guestIds = [
    ...new Set(reservations.map((r) => r.customer_mews_id).filter(Boolean)),
  ] as string[];
  const guestById = new Map<
    string,
    { first_name: string | null; last_name: string | null; raw: Json }
  >();
  if (guestIds.length > 0) {
    const { data: customers } = await admin
      .from("customers")
      .select("mews_id, first_name, last_name, raw")
      .eq("hotel_id", hotelId)
      .in("mews_id", guestIds);
    for (const c of customers ?? []) guestById.set(c.mews_id, c);
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

  // Occupancy per day across the alert horizon.
  const occupancyByDay: Record<string, number> = {};
  const occupancyAlerts: { date: string; occupancyRate: number }[] = [];
  for (let i = 0; i < OCCUPANCY_ALERT_HORIZON; i++) {
    const dayStr = addDays(today, i);
    const dayStart = zonedMidnightUtc(tz, dayStr).toISOString();
    const dayEnd = zonedMidnightUtc(tz, addDays(dayStr, 1)).toISOString();
    const occupied = reservations.filter(
      (r) => r.start_utc! < dayEnd && r.end_utc! > dayStart
    ).length;
    const rate = rooms > 0 ? occupied / rooms : 0;
    if (i < WEEK_HORIZON) occupancyByDay[dayStr] = pct(rate);
    if (rate < LOW_OCCUPANCY) {
      occupancyAlerts.push({ date: dayStr, occupancyRate: pct(rate) });
    }
  }

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

  // Emails.
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

  const todayOccupied = reservations.filter(
    (r) =>
      r.start_utc! < todayEnd.toISOString() &&
      r.end_utc! > todayStart.toISOString()
  ).length;

  return {
    hotel: { name: hotel?.name ?? "the hotel", timezone: tz, rooms, date: today },
    today: {
      arrivals,
      departures,
      inHouse,
      occupancyRate: rooms > 0 ? pct(todayOccupied / rooms) : 0,
    },
    thisWeek: { reservations: weekReservations, occupancyByDay },
    guests: { vipArrivals, specialRequests, missingArrivalTimes },
    emails: { pendingCount, urgentCount, classifications },
    rates: { currentRates: {}, occupancyAlerts },
  };
}
