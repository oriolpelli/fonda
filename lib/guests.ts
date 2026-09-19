import "server-only";

import { readRoomType } from "@/lib/pms-fields";
import { hotelToday, localDateOf } from "@/lib/stay-phase";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/**
 * Guests v1 — the list and the record (APP_UX_PROPOSAL.md §5.4).
 *
 * The inbox's join, run the other way round. lib/inbox.ts starts from messages
 * and asks who sent them; this starts from a guest and asks what happened.
 *
 * Everything reads through the ANON client so RLS is what scopes a hotel, and
 * every query additionally filters on `hotel_id` explicitly. Both, on purpose:
 * RLS is the boundary, and the explicit filter is what makes a mistake in a
 * policy show up as missing data rather than as another hotel's guests.
 */

export type TripPurpose =
  | "leisure"
  | "business"
  | "family"
  | "romantic"
  | "group"
  | "unknown";

export type Occasion = "birthday" | "anniversary" | "honeymoon";

export type PreferenceSource = "email" | "reservation" | "staff";

export interface GuestPreference {
  text: string;
  source: PreferenceSource;
  /** ISO timestamp — when it was recorded, for the source tooltip. */
  at: string;
}

export interface GuestProfile {
  tripPurpose: TripPurpose | null;
  occasion: Occasion | null;
  preferences: GuestPreference[];
  /** Staff-written. Never touched by inference — see migration 0024. */
  notes: string | null;
  inferredAt: string | null;
}

export interface GuestListRow {
  customerId: string;
  name: string;
  /** The stay that explains why they are in this list. */
  arrival: string | null;
  departure: string | null;
  roomType: string | null;
  tripPurpose: TripPurpose | null;
  occasion: Occasion | null;
}

export type GuestView = "in_house_and_arriving" | "all";

interface ReservationRow {
  mews_id: string;
  customer_mews_id: string | null;
  number: string | null;
  start_utc: string | null;
  end_utc: string | null;
  adult_count: number | null;
  child_count: number | null;
  requested_category_id: string | null;
  raw: Json;
}

interface CustomerRow {
  mews_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  nationality_code: string | null;
  language_code: string | null;
}

const RESERVATION_COLUMNS =
  "mews_id, customer_mews_id, number, start_utc, end_utc, adult_count, child_count, requested_category_id, raw";

const CUSTOMER_COLUMNS =
  "mews_id, first_name, last_name, email, phone, nationality_code, language_code";

function fullName(c: Pick<CustomerRow, "first_name" | "last_name">): string {
  return [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
}

function parsePreferences(raw: Json): GuestPreference[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    const source = row.source;
    if (!text) return [];
    if (source !== "email" && source !== "reservation" && source !== "staff") {
      return [];
    }
    return [
      {
        text,
        source,
        at: typeof row.at === "string" ? row.at : "",
      },
    ];
  });
}

function toProfile(row: {
  trip_purpose: string | null;
  occasion: string | null;
  preferences: Json;
  notes: string | null;
  inferred_at: string | null;
} | null): GuestProfile {
  return {
    tripPurpose: (row?.trip_purpose as TripPurpose | null) ?? null,
    occasion: (row?.occasion as Occasion | null) ?? null,
    preferences: parsePreferences(row?.preferences ?? null),
    notes: row?.notes ?? null,
    inferredAt: row?.inferred_at ?? null,
  };
}

/**
 * The guest list.
 *
 * "In house & arriving" is the default view because it is the question a front
 * desk actually asks. "All" is every guest with a reservation, newest stay
 * first, which is a browsing view rather than a working one.
 *
 * Search matches name or email, server-side, and is scoped by the same hotel
 * filter as everything else here — a search box is the easiest place in a
 * product to leak across a tenant boundary, so it does not get its own path.
 */
export async function listGuests(
  hotelId: string,
  { view, q }: { view: GuestView; q?: string }
): Promise<GuestListRow[]> {
  const supabase = await createClient();
  const { data: hotel } = await supabase
    .from("hotels")
    .select("timezone")
    .eq("id", hotelId)
    .maybeSingle();
  const tz = hotel?.timezone || "UTC";
  const today = hotelToday(tz);

  let query = supabase
    .from("reservations")
    .select(RESERVATION_COLUMNS)
    .eq("hotel_id", hotelId)
    .not("customer_mews_id", "is", null)
    .order("start_utc", { ascending: false })
    .limit(500);

  if (view === "in_house_and_arriving") {
    // Anyone whose stay has not finished: in-house today, or arriving later.
    query = query.gte("end_utc", `${today}T00:00:00Z`);
  }

  const { data: reservations } = await query.overrideTypes<ReservationRow[]>();
  const rows = reservations ?? [];
  if (rows.length === 0) return [];

  // One reservation per guest — the one that explains why they are listed.
  const byCustomer = new Map<string, ReservationRow>();
  for (const r of rows) {
    if (!r.customer_mews_id) continue;
    const existing = byCustomer.get(r.customer_mews_id);
    if (!existing) {
      byCustomer.set(r.customer_mews_id, r);
      continue;
    }
    // Prefer the stay covering today, else the one starting soonest from now.
    const better =
      (r.start_utc ?? "") > (existing.start_utc ?? "") &&
      (r.start_utc ?? "") <= `${today}T23:59:59Z`;
    if (better) byCustomer.set(r.customer_mews_id, r);
  }

  const customerIds = [...byCustomer.keys()];
  const [{ data: customers }, { data: profiles }] = await Promise.all([
    supabase
      .from("customers")
      .select(CUSTOMER_COLUMNS)
      .eq("hotel_id", hotelId)
      .in("mews_id", customerIds)
      .overrideTypes<CustomerRow[]>(),
    supabase
      .from("guest_profiles")
      .select("customer_mews_id, trip_purpose, occasion")
      .eq("hotel_id", hotelId)
      .in("customer_mews_id", customerIds),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.customer_mews_id, p])
  );
  const needle = q?.trim().toLowerCase();

  return (customers ?? [])
    .map((c) => {
      const r = byCustomer.get(c.mews_id);
      const profile = profileById.get(c.mews_id);
      return {
        customerId: c.mews_id,
        name: fullName(c) || c.email || c.mews_id,
        arrival: localDateOf(tz, r?.start_utc),
        departure: localDateOf(tz, r?.end_utc),
        roomType: r ? readRoomType(r.raw, r.requested_category_id) : null,
        tripPurpose: (profile?.trip_purpose as TripPurpose | null) ?? null,
        occasion: (profile?.occasion as Occasion | null) ?? null,
        _search: `${fullName(c)} ${c.email ?? ""}`.toLowerCase(),
      };
    })
    .filter((row) => !needle || row._search.includes(needle))
    .sort((a, b) => (b.arrival ?? "").localeCompare(a.arrival ?? ""))
    // The haystack was only ever for the filter above; it does not belong in
    // what the page renders.
    .map((row): GuestListRow => {
      const { _search, ...rest } = row;
      void _search;
      return rest;
    });
}

export interface TimelineEntry {
  kind: "email" | "chaser" | "stay";
  /** ISO timestamp, for ordering and display. */
  at: string;
  title: string;
  /** Status word where the kind has one — email status, chaser status. */
  detail: string | null;
  /** Deep link, where there is one to give. */
  href: string | null;
}

export interface GuestRecord {
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  nationalityCode: string | null;
  languageCode: string | null;
  arrival: string | null;
  departure: string | null;
  nights: number | null;
  roomType: string | null;
  adults: number | null;
  children: number | null;
  priorStays: number;
  profile: GuestProfile;
  timeline: TimelineEntry[];
  /** The newest email's timestamp — decides whether inference is stale. */
  latestEmailAt: string | null;
}

function nightsBetween(a: string, b: string): number | null {
  const from = Date.parse(`${a}T00:00:00Z`);
  const to = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  const n = Math.round((to - from) / 86_400_000);
  return n > 0 ? n : null;
}

/**
 * One guest's record: the facts, the profile, and a merged timeline.
 *
 * The timeline deliberately mixes three sources — email, check-in chasers and
 * prior stays — in one reverse-chronological list rather than three tabs. What
 * a GM wants to reconstruct is a sequence ("they asked about parking, then we
 * chased their ETA, then they stayed"), and three tabs make the reader do the
 * interleaving.
 */
export async function loadGuestRecord(
  hotelId: string,
  customerMewsId: string
): Promise<GuestRecord | null> {
  const supabase = await createClient();
  const { data: hotel } = await supabase
    .from("hotels")
    .select("timezone")
    .eq("id", hotelId)
    .maybeSingle();
  const tz = hotel?.timezone || "UTC";
  const today = hotelToday(tz);

  const { data: customer } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("hotel_id", hotelId)
    .eq("mews_id", customerMewsId)
    .maybeSingle<CustomerRow>();
  if (!customer) return null;

  const [{ data: reservations }, { data: profileRow }, { data: emails }] =
    await Promise.all([
      supabase
        .from("reservations")
        .select(RESERVATION_COLUMNS)
        .eq("hotel_id", hotelId)
        .eq("customer_mews_id", customerMewsId)
        .order("start_utc", { ascending: false })
        .overrideTypes<ReservationRow[]>(),
      supabase
        .from("guest_profiles")
        .select("trip_purpose, occasion, preferences, notes, inferred_at")
        .eq("hotel_id", hotelId)
        .eq("customer_mews_id", customerMewsId)
        .maybeSingle(),
      supabase
        .from("emails")
        .select("id, subject, status, created_at")
        .eq("hotel_id", hotelId)
        .eq("customer_mews_id", customerMewsId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const stays = reservations ?? [];
  const current =
    stays.find((r) => {
      const start = localDateOf(tz, r.start_utc);
      const end = localDateOf(tz, r.end_utc);
      return Boolean(start && end && start <= today && today <= end);
    }) ??
    stays.find((r) => {
      const start = localDateOf(tz, r.start_utc);
      return Boolean(start && start > today);
    }) ??
    stays[0];

  const { data: chasers } = await supabase
    .from("checkin_chasers")
    .select("id, status, sent_at, created_at, reservation_id")
    .eq("hotel_id", hotelId)
    .in("reservation_id", stays.map((r) => r.mews_id))
    .limit(50);

  const arrival = localDateOf(tz, current?.start_utc);
  const departure = localDateOf(tz, current?.end_utc);

  const timeline: TimelineEntry[] = [
    ...(emails ?? []).map((e) => ({
      kind: "email" as const,
      at: e.created_at,
      title: e.subject || "",
      detail: e.status,
      href: `/dashboard/communications?email=${e.id}`,
    })),
    ...(chasers ?? []).map((c) => ({
      kind: "chaser" as const,
      at: c.sent_at ?? c.created_at,
      title: "",
      detail: c.status,
      href: null,
    })),
    ...stays.map((r) => ({
      kind: "stay" as const,
      at: r.start_utc ?? "",
      title: r.number ?? "",
      detail: readRoomType(r.raw, r.requested_category_id),
      href: null,
    })),
  ]
    .filter((entry) => entry.at)
    .sort((a, b) => b.at.localeCompare(a.at));

  return {
    customerId: customer.mews_id,
    name: fullName(customer) || customer.email || customer.mews_id,
    email: customer.email,
    phone: customer.phone,
    nationalityCode: customer.nationality_code,
    languageCode: customer.language_code,
    arrival,
    departure,
    nights: arrival && departure ? nightsBetween(arrival, departure) : null,
    roomType: current ? readRoomType(current.raw, current.requested_category_id) : null,
    adults: current?.adult_count ?? null,
    children: current?.child_count ?? null,
    priorStays: stays.filter((r) => {
      if (r.mews_id === current?.mews_id) return false;
      const end = localDateOf(tz, r.end_utc);
      return Boolean(end && end < today);
    }).length,
    profile: toProfile(profileRow),
    timeline,
    latestEmailAt: emails?.[0]?.created_at ?? null,
  };
}
