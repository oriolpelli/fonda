/**
 * The priority to-do list — "what should I handle first?" at 7am.
 *
 * Rules only, no AI. A GM has to be able to predict what appears here and why;
 * a model that reranks the list overnight would make the page untrustworthy in
 * exactly the moment it needs to be trusted. The thresholds below are the whole
 * of the tuning surface, kept together at the top so they can be changed from
 * hospitality experience without reading the rest.
 *
 * Pure and dependency-free (no dictionary, no database, no clock): every rule
 * takes what it needs as an argument, so the ranking can be exercised directly
 * with fixtures. UI copy is deliberately absent — each item carries a `kind`
 * and the values to interpolate, and the page renders
 * `t(dict.home.todo[kind], item.vars)`. That keeps the list translatable into
 * en/es/ca without the rules knowing any language.
 *
 * Ranking is strict: rank 0 outranks everything below it. Ties are broken by
 * how bad the thing is (longest wait, emptiest day).
 */

import { WAITING_HOURS, type Urgency } from "@/lib/email-urgency";

// --- tuning ----------------------------------------------------------------

/**
 * Missing arrival times for tomorrow only become a to-do beyond this many —
 * one or two unknown ETAs is a normal evening, not something to act on.
 * Fires at 4+.
 */
export const UNCONFIRMED_ETA_THRESHOLD = 3;

/** A night below this percentage is soft enough to be worth a look. */
export const LOW_OCCUPANCY_PCT = 40;

/** At most this many complaint / VIP items each, so one bad day can't flood the list. */
export const PER_RULE_CAP = 2;

/** Hard ceiling on the list — beyond this it stops being a list of priorities. */
export const MAX_TODO_ITEMS = 6;

// Unanswered-email age is NOT redefined here: it is WAITING_HOURS (24h) from
// lib/email-urgency.ts, the same threshold the inbox shows a "waiting" note at.
export { WAITING_HOURS };

// --- shape -----------------------------------------------------------------

export type TodoKind =
  | "complaint"
  | "vip_no_note"
  | "unconfirmed_etas"
  | "waiting_email"
  | "low_occupancy";

/** Lower is more urgent. */
const RANK: Record<TodoKind, number> = {
  complaint: 0,
  vip_no_note: 1,
  unconfirmed_etas: 2,
  waiting_email: 3,
  low_occupancy: 4,
};

/** Where the GM goes to act on an item. Locale prefix is added by the page. */
export type TodoTarget =
  | { page: "communications"; emailId?: string }
  | { page: "checkins" }
  | { page: "occupancy" }; // the 14-day strip on the dashboard itself

export interface TodoItem {
  /** Stable React key. */
  id: string;
  kind: TodoKind;
  rank: number;
  /** Values for the dictionary template. Never pre-formatted prose. */
  vars: Record<string, string | number>;
  target: TodoTarget;
  /** True for the single item allowed to carry the navy signal. */
  primary: boolean;
}

// --- inputs ----------------------------------------------------------------

/** One unhandled guest email, already scored by lib/email-urgency.ts. */
export interface TodoEmail {
  id: string;
  guest_name: string | null;
  from_email: string | null;
  urgency: Urgency;
}

export interface TodoInput {
  emails: TodoEmail[];
  /** VIPs arriving today with no note on the booking. */
  vipArrivalsWithoutNote: { reservationId: string; name: string }[];
  /** Confirmed arrivals tomorrow with no arrival time on file. */
  unconfirmedEtasTomorrow: number;
  /** Tonight and the next 13 nights. */
  outlook: { date: string; occupancyPct: number }[];
  /** Rooms in the hotel. Zero disables the occupancy rule — see below. */
  rooms: number;
  /** Whether a PMS sync has ever completed. */
  hasSyncedData: boolean;
}

/** Whoever sent the email, in the order a human would recognise them. */
function senderLabel(email: TodoEmail): string {
  return email.guest_name?.trim() || email.from_email?.trim() || "";
}

// --- the rules -------------------------------------------------------------

/**
 * Ranked actions for today. Returns at most MAX_TODO_ITEMS, most urgent first.
 * An empty array is a legitimate, good result: nothing needs attention.
 */
export function buildTodoList(input: TodoInput): TodoItem[] {
  const items: TodoItem[] = [];

  // 0 — Unanswered complaints. Always first: a complaint left overnight is the
  //     one thing on this page that can cost a review.
  const complaints = input.emails.filter((e) => e.urgency.kind === "complaint");
  for (const email of complaints.slice(0, PER_RULE_CAP)) {
    items.push({
      id: `complaint:${email.id}`,
      kind: "complaint",
      rank: RANK.complaint,
      vars: { guest: senderLabel(email) },
      target: { page: "communications", emailId: email.id },
      primary: items.length === 0,
    });
  }

  // 1 — A VIP arriving today that nobody has written a note for. Fixable in the
  //     minutes before they walk in, and invisible once they have.
  for (const vip of input.vipArrivalsWithoutNote.slice(0, PER_RULE_CAP)) {
    items.push({
      id: `vip:${vip.reservationId}`,
      kind: "vip_no_note",
      rank: RANK.vip_no_note,
      vars: { guest: vip.name },
      target: { page: "checkins" },
      primary: items.length === 0,
    });
  }

  // 2 — Tomorrow's desk can't be planned without arrival times.
  if (input.unconfirmedEtasTomorrow > UNCONFIRMED_ETA_THRESHOLD) {
    items.push({
      id: "etas:tomorrow",
      kind: "unconfirmed_etas",
      rank: RANK.unconfirmed_etas,
      vars: { count: input.unconfirmedEtasTomorrow },
      target: { page: "checkins" },
      primary: items.length === 0,
    });
  }

  // 3 — Guest mail going stale. One item for the longest wait, mentioning how
  //     many others are behind it, rather than one line per email — the inbox
  //     is where you work through them.
  const waiting = input.emails
    .filter((e) => e.urgency.kind === "waiting")
    .sort((a, b) => (b.urgency.hoursWaiting ?? 0) - (a.urgency.hoursWaiting ?? 0));
  const oldest = waiting[0];
  if (oldest) {
    items.push({
      id: `waiting:${oldest.id}`,
      kind: "waiting_email",
      rank: RANK.waiting_email,
      vars: {
        guest: senderLabel(oldest),
        hours: oldest.urgency.hoursWaiting ?? WAITING_HOURS,
        others: waiting.length - 1,
      },
      target: { page: "communications", emailId: oldest.id },
      primary: items.length === 0,
    });
  }

  // 4 — The emptiest soft night in the next fortnight. A soft date, not an
  //     emergency: it sits last and names one day, so a quiet fortnight doesn't
  //     bury the complaint at the top under fourteen occupancy lines.
  //
  //     Skipped entirely when the hotel has no room count or has never synced —
  //     both make occupancy read as 0%, which would fire this rule every day
  //     for a hotel that simply hasn't finished setting up.
  if (input.rooms > 0 && input.hasSyncedData) {
    const soft = input.outlook
      .filter((d) => d.occupancyPct < LOW_OCCUPANCY_PCT)
      .sort((a, b) => a.occupancyPct - b.occupancyPct || a.date.localeCompare(b.date));
    const worst = soft[0];
    if (worst) {
      items.push({
        id: `occupancy:${worst.date}`,
        kind: "low_occupancy",
        rank: RANK.low_occupancy,
        vars: {
          date: worst.date,
          percent: worst.occupancyPct,
          others: soft.length - 1,
        },
        target: { page: "occupancy" },
        primary: items.length === 0,
      });
    }
  }

  return items.sort((a, b) => a.rank - b.rank).slice(0, MAX_TODO_ITEMS);
}
