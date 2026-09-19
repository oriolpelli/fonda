import "server-only";

import { readRoomType } from "@/lib/pms-fields";
import { hotelToday, localDateOf, stayPhaseFor } from "@/lib/stay-phase";
import { createClient } from "@/lib/supabase/server";
import type { InboxEmail } from "@/lib/inbox";
import type { Json } from "@/types/database";

/**
 * The guest-context pane's read model (APP_UX_PROPOSAL.md §1.5, §5.3).
 *
 * Loaded and rendered entirely on the server. None of these fields reaches a
 * Client Component: the pane is rendered here and handed to the inbox as a
 * ready-made slot, so `nationality`, `language` and the party size never cross
 * the boundary as data. See the note on `InboxEmail.contextKey`.
 *
 * A separate loader from `withGuestContext` on purpose. That one resolves the
 * booking behind each MESSAGE and feeds urgency; this resolves the guest behind
 * each CONVERSATION and feeds a panel. They answer different questions, they
 * are keyed differently (message vs guest), and only this one pays for the
 * prior-stay count.
 */
export interface GuestContext {
  /** Matches `InboxEmail.contextKey`. */
  key: string;
  /** What to call them. The sender's address when no booking matched. */
  displayName: string | null;
  /** False when no reservation matched — the pane says so and offers nothing. */
  matched: boolean;
  /** For the "Open guest record" link. Null when unmatched. */
  customerId: string | null;
  nationalityCode: string | null;
  languageCode: string | null;
  /** Hotel-local dates of the stay this conversation is about. */
  arrival: string | null;
  departure: string | null;
  nights: number | null;
  roomType: string | null;
  adults: number | null;
  children: number | null;
  /**
   * Completed stays BEFORE the one in view — so "3rd stay" is `priorStays: 2`.
   * Counts departures strictly before today, which is why a guest checking out
   * this morning is not yet counted as returning.
   */
  priorStays: number;
}

interface ReservationRow {
  mews_id: string;
  customer_mews_id: string | null;
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
  nationality_code: string | null;
  language_code: string | null;
}

/** Whole nights between two hotel-local dates. */
function nightsBetween(arrival: string, departure: string): number | null {
  const a = Date.parse(`${arrival}T00:00:00Z`);
  const b = Date.parse(`${departure}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  const n = Math.round((b - a) / 86_400_000);
  return n > 0 ? n : null;
}

/**
 * The reservation this conversation is about: the stay covering today, else
 * the nearest future one, else the most recent past one. Same rule
 * `lib/inbox.ts` uses to pick a message's booking — the pane must not disagree
 * with the dates already shown on the row.
 */
function relevantReservation(
  rows: ReservationRow[],
  tz: string,
  today: string
): ReservationRow | undefined {
  let upcoming: ReservationRow | undefined;
  let past: ReservationRow | undefined;
  for (const r of rows) {
    const arrival = localDateOf(tz, r.start_utc);
    const departure = localDateOf(tz, r.end_utc);
    if (stayPhaseFor(arrival, departure, today) === "in_house") return r;
    if (arrival && arrival > today) {
      const best = upcoming ? localDateOf(tz, upcoming.start_utc) : null;
      if (!best || arrival < best) upcoming = r;
    } else if (arrival) {
      const best = past ? localDateOf(tz, past.start_utc) : null;
      if (!best || arrival > best) past = r;
    }
  }
  return upcoming ?? past;
}

/**
 * One context per distinct `contextKey` in the list.
 *
 * Two queries regardless of list length — customers, then their reservations —
 * rather than one per message. The prior-stay count falls out of the
 * reservations already fetched, so it costs nothing extra.
 */
export async function loadGuestContexts(
  emails: InboxEmail[]
): Promise<Map<string, GuestContext>> {
  const out = new Map<string, GuestContext>();
  if (emails.length === 0) return out;

  const supabase = await createClient();
  const { data: hotel } = await supabase
    .from("hotels")
    .select("id, timezone")
    .maybeSingle();
  if (!hotel) return out;

  const tz = hotel.timezone || "UTC";
  const today = hotelToday(tz);

  // Unmatched senders need no lookup — everything the pane shows about them is
  // already on the row.
  for (const email of emails) {
    if (email.contextKey.startsWith("e:") && !out.has(email.contextKey)) {
      out.set(email.contextKey, {
        key: email.contextKey,
        displayName: email.guest_name ?? email.from_email,
        matched: false,
        customerId: null,
        nationalityCode: null,
        languageCode: null,
        arrival: null,
        departure: null,
        nights: null,
        roomType: null,
        adults: null,
        children: null,
        priorStays: 0,
      });
    }
  }

  const customerIds = [
    ...new Set(
      emails
        .filter((e) => e.contextKey.startsWith("c:"))
        .map((e) => e.contextKey.slice(2))
    ),
  ];
  if (customerIds.length === 0) return out;

  const [{ data: customers }, { data: reservations }] = await Promise.all([
    supabase
      .from("customers")
      .select("mews_id, first_name, last_name, nationality_code, language_code")
      .eq("hotel_id", hotel.id)
      .in("mews_id", customerIds)
      .overrideTypes<CustomerRow[]>(),
    supabase
      .from("reservations")
      .select(
        "mews_id, customer_mews_id, start_utc, end_utc, adult_count, child_count, requested_category_id, raw"
      )
      .eq("hotel_id", hotel.id)
      .in("customer_mews_id", customerIds)
      .overrideTypes<ReservationRow[]>(),
  ]);

  const customerById = new Map((customers ?? []).map((c) => [c.mews_id, c]));
  const byCustomer = new Map<string, ReservationRow[]>();
  for (const r of reservations ?? []) {
    if (!r.customer_mews_id) continue;
    const list = byCustomer.get(r.customer_mews_id) ?? [];
    list.push(r);
    byCustomer.set(r.customer_mews_id, list);
  }

  for (const id of customerIds) {
    const customer = customerById.get(id);
    const rows = byCustomer.get(id) ?? [];
    const reservation = relevantReservation(rows, tz, today);
    const arrival = localDateOf(tz, reservation?.start_utc);
    const departure = localDateOf(tz, reservation?.end_utc);

    // Stays that finished before today, and not the one in view. A guest
    // checking out this morning is still in-house, so they are not yet
    // "returning" — the count must agree with what the desk would say.
    const priorStays = rows.filter((r) => {
      if (r.mews_id === reservation?.mews_id) return false;
      const end = localDateOf(tz, r.end_utc);
      return Boolean(end && end < today);
    }).length;

    const name = [customer?.first_name, customer?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    out.set(`c:${id}`, {
      key: `c:${id}`,
      displayName: name || null,
      matched: Boolean(reservation),
      customerId: id,
      nationalityCode: customer?.nationality_code ?? null,
      languageCode: customer?.language_code ?? null,
      arrival,
      departure,
      nights: arrival && departure ? nightsBetween(arrival, departure) : null,
      roomType: reservation
        ? readRoomType(reservation.raw, reservation.requested_category_id)
        : null,
      adults: reservation?.adult_count ?? null,
      children: reservation?.child_count ?? null,
      priorStays,
    });
  }

  return out;
}
