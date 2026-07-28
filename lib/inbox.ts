import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { computeUrgency, type Urgency } from "@/lib/email-urgency";
import {
  hotelToday,
  localDateOf,
  stayPhaseFor,
} from "@/lib/stay-phase";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * The read model behind /dashboard/communications — the single guest-email
 * inbox.
 *
 * It shows every guest message, whatever stay phase the sender is in and
 * whether or not a booking matched. In-house guests turn out to email rarely
 * enough that a separate Concierge inbox wasn't earning its place; the stay
 * phase machinery still runs, but now it feeds *context* (guest name, stay
 * dates) and *urgency* rather than a split. /dashboard/concierge is parked as
 * a stub for future in-house / WhatsApp messaging.
 *
 * Nothing derived here is stored. Both the booking context and the urgency
 * note are recomputed on every read, because "arrives today" is only true for
 * one day. What the database holds is the durable link written by
 * lib/email-processor.ts (`reservation_mews_id` / `customer_mews_id`); emails
 * ingested before that link existed fall back to resolving the guest by
 * `from_email`, so history reads correctly without a backfill.
 */

type Db = SupabaseClient<Database>;

const EMAIL_COLUMNS =
  "id, from_email, subject, body, classification, draft_reply, status, created_at, sent_at, reservation_mews_id, customer_mews_id";

const RESERVATION_COLUMNS =
  "mews_id, customer_mews_id, number, start_utc, end_utc";

/** Statuses that still need a human: they drive the sidebar badge count. */
const UNHANDLED_STATUSES = ["pending", "needs_attention"] as const;

export interface InboxEmail {
  id: string;
  from_email: string | null;
  subject: string | null;
  body: string | null;
  classification: string | null;
  draft_reply: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
  /** Booking context, shown inline. Null when no reservation matched. */
  guest_name: string | null;
  booking_ref: string | null;
  arrival: string | null;
  departure: string | null;
  /** Derived per read — see lib/email-urgency.ts. */
  urgency: Urgency;
}

interface EmailRow {
  id: string;
  from_email: string | null;
  subject: string | null;
  body: string | null;
  classification: string | null;
  draft_reply: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
  reservation_mews_id: string | null;
  customer_mews_id: string | null;
}

interface ReservationRow {
  mews_id: string;
  customer_mews_id: string | null;
  number: string | null;
  start_utc: string | null;
  end_utc: string | null;
}

interface CustomerRow {
  mews_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

function guestName(customer: CustomerRow | undefined): string | null {
  if (!customer) return null;
  const name = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || null;
}

/**
 * Of the reservations belonging to one guest, the one that describes them best
 * right now: a stay covering today if there is one, otherwise the nearest
 * upcoming stay, otherwise the most recent past one.
 */
function relevantReservation(
  reservations: ReservationRow[],
  tz: string,
  today: string
): ReservationRow | undefined {
  let upcoming: ReservationRow | undefined;
  let past: ReservationRow | undefined;

  for (const r of reservations) {
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

async function selectIn<T>(
  db: Db,
  table: "reservations" | "customers",
  columns: string,
  hotelId: string,
  column: string,
  values: string[]
): Promise<T[]> {
  if (values.length === 0) return [];
  const { data } = await db
    .from(table)
    .select(columns)
    .eq("hotel_id", hotelId)
    .in(column, values);
  return (data ?? []) as T[];
}

/**
 * Attaches booking context and an urgency signal to a batch of email rows.
 * Both are derived, never stored.
 */
export async function withGuestContext(
  db: Db,
  hotelId: string,
  timezone: string | null,
  rows: EmailRow[]
): Promise<InboxEmail[]> {
  const tz = timezone || "UTC";
  const today = hotelToday(tz);
  const now = new Date();

  const reservationIds = [
    ...new Set(rows.map((r) => r.reservation_mews_id).filter(Boolean)),
  ] as string[];
  // Senders with no stored reservation link — resolve them by address instead.
  const senderEmails = [
    ...new Set(
      rows
        .filter((r) => !r.reservation_mews_id && r.from_email)
        .map((r) => r.from_email!.toLowerCase())
    ),
  ];

  const [linkedReservations, customersByAddress] = await Promise.all([
    selectIn<ReservationRow>(
      db,
      "reservations",
      RESERVATION_COLUMNS,
      hotelId,
      "mews_id",
      reservationIds
    ),
    selectIn<CustomerRow>(
      db,
      "customers",
      "mews_id, first_name, last_name, email",
      hotelId,
      "email",
      senderEmails
    ),
  ]);

  const byAddress = new Map<string, CustomerRow>();
  for (const c of customersByAddress) {
    if (c.email) byAddress.set(c.email.toLowerCase(), c);
  }

  // Every guest we now know about, whether linked directly or found by address.
  const customerIds = [
    ...new Set([
      ...rows.map((r) => r.customer_mews_id).filter(Boolean),
      ...linkedReservations.map((r) => r.customer_mews_id).filter(Boolean),
      ...[...byAddress.values()].map((c) => c.mews_id),
    ]),
  ] as string[];

  // Reservations belonging to address-matched guests (no stored link).
  const fallbackCustomerIds = [
    ...new Set([...byAddress.values()].map((c) => c.mews_id)),
  ];

  const [customers, fallbackReservations] = await Promise.all([
    selectIn<CustomerRow>(
      db,
      "customers",
      "mews_id, first_name, last_name, email",
      hotelId,
      "mews_id",
      customerIds
    ),
    selectIn<ReservationRow>(
      db,
      "reservations",
      RESERVATION_COLUMNS,
      hotelId,
      "customer_mews_id",
      fallbackCustomerIds
    ),
  ]);

  const customerById = new Map(customers.map((c) => [c.mews_id, c]));
  const reservationById = new Map(linkedReservations.map((r) => [r.mews_id, r]));
  const reservationsByCustomer = new Map<string, ReservationRow[]>();
  for (const r of fallbackReservations) {
    if (!r.customer_mews_id) continue;
    const list = reservationsByCustomer.get(r.customer_mews_id) ?? [];
    list.push(r);
    reservationsByCustomer.set(r.customer_mews_id, list);
  }

  return rows.map((row) => {
    const fallbackGuest = row.from_email
      ? byAddress.get(row.from_email.toLowerCase())
      : undefined;

    const reservation = row.reservation_mews_id
      ? reservationById.get(row.reservation_mews_id)
      : fallbackGuest
        ? relevantReservation(
            reservationsByCustomer.get(fallbackGuest.mews_id) ?? [],
            tz,
            today
          )
        : undefined;

    const customerId =
      row.customer_mews_id ??
      reservation?.customer_mews_id ??
      fallbackGuest?.mews_id ??
      null;

    const arrival = localDateOf(tz, reservation?.start_utc);
    const departure = localDateOf(tz, reservation?.end_utc);

    return {
      id: row.id,
      from_email: row.from_email,
      subject: row.subject,
      body: row.body,
      classification: row.classification,
      draft_reply: row.draft_reply,
      status: row.status,
      created_at: row.created_at,
      sent_at: row.sent_at,
      guest_name:
        guestName(customerId ? customerById.get(customerId) : undefined) ??
        guestName(fallbackGuest),
      booking_ref: reservation?.number ?? null,
      arrival,
      departure,
      urgency: computeUrgency({
        classification: row.classification,
        status: row.status,
        arrival,
        createdAt: row.created_at,
        today,
        now,
      }),
    };
  });
}

/** The caller's hotel id + timezone, via RLS (`hotels: read own`). */
async function currentHotel(
  db: Db
): Promise<{ id: string; timezone: string | null } | null> {
  const { data } = await db.from("hotels").select("id, timezone").maybeSingle();
  return data ?? null;
}

export interface InboxData {
  emails: InboxEmail[];
  draftsReady: number;
  sentToday: number;
  avgResponseHours: number | null;
}

/**
 * Loads the whole guest inbox for the signed-in user's hotel. RLS scopes the
 * `emails` read; the reservation/customer lookups are scoped both by RLS and
 * explicitly by hotel id.
 *
 * Rows come back newest-first; the sort toggle reorders them client-side so
 * switching is instant.
 */
export async function loadInbox(): Promise<InboxData> {
  const supabase = await createClient();
  const hotel = await currentHotel(supabase);

  const empty: InboxData = {
    emails: [],
    draftsReady: 0,
    sentToday: 0,
    avgResponseHours: null,
  };
  if (!hotel) return empty;

  const { data } = await supabase
    .from("emails")
    .select(EMAIL_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);

  const emails = await withGuestContext(
    supabase,
    hotel.id,
    hotel.timezone,
    (data ?? []) as EmailRow[]
  );

  const today = hotelToday(hotel.timezone);
  const draftsReady = emails.filter(
    (e) => e.status === "pending" && e.draft_reply
  ).length;
  const sentToday = emails.filter(
    (e) =>
      e.status === "sent" &&
      e.sent_at &&
      localDateOf(hotel.timezone || "UTC", e.sent_at) === today
  ).length;

  const responded = emails.filter((e) => e.status === "sent" && e.sent_at);
  const avgResponseHours =
    responded.length > 0
      ? responded.reduce(
          (sum, e) =>
            sum +
            (new Date(e.sent_at!).getTime() - new Date(e.created_at).getTime()) /
              3_600_000,
          0
        ) / responded.length
      : null;

  return { emails, draftsReady, sentToday, avgResponseHours };
}

export interface InboxBadge {
  /** Messages still waiting on a human (pending or flagged). */
  count: number;
  /** True when at least one of them is a complaint — the only navy signal. */
  alert: boolean;
}

/**
 * The unhandled count for the sidebar. Deliberately fails soft: a badge is
 * decoration, and a broken query here must not take down every dashboard page
 * (the layout renders on all of them).
 */
export async function loadInboxBadge(): Promise<InboxBadge> {
  const zero: InboxBadge = { count: 0, alert: false };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("emails")
      .select("status, classification")
      .in("status", [...UNHANDLED_STATUSES])
      .limit(500);
    if (error) return zero;

    const rows = data ?? [];
    return {
      count: rows.length,
      alert: rows.some(
        (r) => r.status === "needs_attention" || r.classification === "complaint"
      ),
    };
  } catch {
    return zero;
  }
}
