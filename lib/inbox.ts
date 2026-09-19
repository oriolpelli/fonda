import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { computeUrgency, type Urgency } from "@/lib/email-urgency";
import {
  hotelToday,
  localDateOf,
  type StayPhase,
  stayPhaseFor,
} from "@/lib/stay-phase";
import { fetchInChunks } from "@/lib/supabase/paged";
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
/**
 * Statuses that still need a human. Exported since W6: the Communications
 * parent route decides which window to send you to by asking which one has
 * unanswered mail, and it must ask the same question the badge does.
 */
export const UNHANDLED_STATUSES = ["pending", "needs_attention"] as const;

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
  /**
   * Which Communications window owns this message (APP_UX_PROPOSAL.md §5.3).
   * Derived per read from the matched booking's dates — never stored, because
   * a stored phase is wrong the morning after a guest checks out.
   */
  stayPhase: StayPhase;
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
      // Computed from the dates just resolved, so a message follows its guest
      // across the two windows as the stay moves, with nothing rewritten.
      stayPhase: stayPhaseFor(arrival, departure, today),
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
  /** True when at least one of them is a complaint. */
  alert: boolean;
}

/**
 * One badge per Communications window (APP_UX_PROPOSAL.md §5.3).
 *
 * W6 split the inbox in two, and a single count on a parent that is only a
 * redirect would point at neither window. The two add up to what the one badge
 * showed before — that is the invariant to check if these ever look wrong.
 */
export interface InboxBadges {
  inHouse: InboxBadge;
  upcoming: InboxBadge;
}

/**
 * The unhandled counts for the sidebar. Deliberately fails soft: a badge is
 * decoration, and a broken query here must not take down every dashboard page
 * (the layout renders on all of them).
 *
 * COST. This used to be a two-column read that counted rows. Splitting by
 * window needs each message's stay phase, and a phase needs the matched
 * booking's dates — so the unhandled rows now go through `withGuestContext`
 * like the inbox proper. That is affordable precisely because they are the
 * unhandled ones: mail waiting on a human is a working queue a GM is actively
 * emptying, not the 200-row history `loadInbox` pages through. If a property
 * ever lets this grow into the hundreds, the badge is the wrong thing to
 * optimise — the queue is.
 */
export async function loadInboxBadges(): Promise<InboxBadges> {
  const zero: InboxBadge = { count: 0, alert: false };
  const none: InboxBadges = { inHouse: zero, upcoming: { ...zero } };

  try {
    const supabase = await createClient();
    const hotel = await currentHotel(supabase);
    if (!hotel) return none;

    const { data, error } = await supabase
      .from("emails")
      .select(EMAIL_COLUMNS)
      .in("status", [...UNHANDLED_STATUSES])
      .limit(500);
    if (error) return none;

    const emails = await withGuestContext(
      supabase,
      hotel.id,
      hotel.timezone,
      (data ?? []) as EmailRow[]
    );

    const tally = (rows: InboxEmail[]): InboxBadge => ({
      count: rows.length,
      alert: rows.some(
        (r) => r.status === "needs_attention" || r.classification === "complaint"
      ),
    });

    return {
      inHouse: tally(emails.filter((e) => e.stayPhase === "in_house")),
      // Everything that is not in-house, which is exactly what the Upcoming
      // window shows once its chip is on. The chip hides rows; it does not
      // make them handled, so the badge counts them either way — a count that
      // changed with a display filter would be telling you how much work you
      // can see rather than how much there is.
      upcoming: tally(emails.filter((e) => e.stayPhase !== "in_house")),
    };
  } catch {
    return none;
  }
}

/**
 * The newest email linked to each of these reservations, as
 * `reservationId -> emailId`.
 *
 * Home's VIP widget uses it to send the GM to the conversation instead of a
 * list, when there is a conversation to send them to. Only the stored link
 * counts (`emails.reservation_mews_id`, written by lib/email-processor.ts) —
 * resolving by address the way `withGuestContext` does would be guessing at
 * which booking a message belongs to, and this link is a navigation target, not
 * context.
 *
 * Reservations with no mail are simply absent from the map; the caller falls
 * back to its own destination.
 */
export async function loadReservationThreads(
  reservationIds: string[]
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (reservationIds.length === 0) return found;

  const supabase = await createClient();
  const rows = await fetchInChunks<{
    id: string;
    reservation_mews_id: string | null;
  }>(reservationIds, (chunk) =>
    supabase
      .from("emails")
      .select("id, reservation_mews_id")
      .in("reservation_mews_id", chunk)
      .order("created_at", { ascending: false })
  );

  // Newest first, so the first row seen for a reservation is the one to open.
  for (const row of rows) {
    if (row.reservation_mews_id && !found.has(row.reservation_mews_id)) {
      found.set(row.reservation_mews_id, row.id);
    }
  }
  return found;
}
