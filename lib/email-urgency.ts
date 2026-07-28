/**
 * Per-email urgency — the "what should I open first?" rule set.
 *
 * Pure and dependency-free so the thresholds below can be tuned from
 * hospitality experience without touching the inbox, and so the rules can be
 * exercised directly. Nothing here is stored: "arrives today" is true for
 * exactly one day, so it is computed fresh on every read (see lib/inbox.ts).
 *
 * The rules are ranked — the first one that matches wins, and the same order
 * drives the "by urgency" sort.
 *
 *   0  complaint       a complaint, or anything flagged for personal attention
 *   1  arrives_today   the matched guest checks in today (hotel-local)
 *   2  arrives_soon    the matched guest checks in within ARRIVAL_SOON_DAYS
 *   3  waiting         unanswered for longer than WAITING_HOURS
 *   4  none            nothing notable — no note is shown
 *   5  handled         already sent or ignored; never carries a note
 *
 * Only unhandled mail can carry a note. Once you have replied, the note has
 * done its job and would just be noise.
 */

/** Tunable thresholds. Both are deliberately the only magic numbers here. */
export const ARRIVAL_SOON_DAYS = 2;
export const WAITING_HOURS = 24;

/** Statuses that still need a human. */
const UNHANDLED = new Set(["pending", "needs_attention"]);

export type UrgencyKind =
  | "complaint"
  | "arrives_today"
  | "arrives_soon"
  | "waiting"
  | "none"
  | "handled";

const RANK: Record<UrgencyKind, number> = {
  complaint: 0,
  arrives_today: 1,
  arrives_soon: 2,
  waiting: 3,
  none: 4,
  handled: 5,
};

export interface Urgency {
  kind: UrgencyKind;
  /** Lower is more urgent; drives the "by urgency" sort. */
  rank: number;
  /** Days until check-in (0 = today). Null unless an arrival rule matched. */
  daysUntilArrival: number | null;
  /** Whole hours unanswered. Null unless the waiting rule matched. */
  hoursWaiting: number | null;
  /** True when this should be surfaced as a note in the list. */
  hasNote: boolean;
}

/** Whole days from one YYYY-MM-DD to another. Both are calendar dates. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.round((b - a) / 86_400_000);
}

function signal(
  kind: UrgencyKind,
  extra: Partial<Urgency> = {}
): Urgency {
  return {
    kind,
    rank: RANK[kind],
    daysUntilArrival: null,
    hoursWaiting: null,
    hasNote: kind !== "none" && kind !== "handled",
    ...extra,
  };
}

export interface UrgencyInput {
  classification: string | null;
  status: string;
  /** Check-in date of the matched booking (YYYY-MM-DD, hotel-local), if any. */
  arrival: string | null;
  /** When the email landed (ISO timestamp). */
  createdAt: string;
  /** Today's date in the hotel's timezone (YYYY-MM-DD). */
  today: string;
  /** "Now", injected so the rules stay pure and testable. */
  now?: Date;
}

export function computeUrgency(input: UrgencyInput): Urgency {
  const { classification, status, arrival, createdAt, today } = input;

  // Already dealt with — no note, sorts last.
  if (!UNHANDLED.has(status)) return signal("handled");

  // 0 — a complaint, or anything a human flagged for personal attention.
  if (classification === "complaint" || status === "needs_attention") {
    return signal("complaint");
  }

  // 1 & 2 — an arrival we can see coming.
  if (arrival) {
    const days = daysBetween(today, arrival);
    if (!Number.isNaN(days)) {
      if (days === 0) return signal("arrives_today", { daysUntilArrival: 0 });
      if (days > 0 && days <= ARRIVAL_SOON_DAYS) {
        return signal("arrives_soon", { daysUntilArrival: days });
      }
    }
  }

  // 3 — nobody has replied and the clock is running.
  const hoursWaiting =
    ((input.now ?? new Date()).getTime() - Date.parse(createdAt)) / 3_600_000;
  if (Number.isFinite(hoursWaiting) && hoursWaiting >= WAITING_HOURS) {
    return signal("waiting", { hoursWaiting: Math.floor(hoursWaiting) });
  }

  return signal("none");
}

/**
 * Comparator for "by urgency": rank first, then soonest arrival, then longest
 * wait, then newest. Complaints surface above everything else.
 */
export function byUrgency(
  a: { urgency: Urgency; created_at: string },
  b: { urgency: Urgency; created_at: string }
): number {
  if (a.urgency.rank !== b.urgency.rank) return a.urgency.rank - b.urgency.rank;

  // Same rank: soonest arrival first…
  const arrivalA = a.urgency.daysUntilArrival;
  const arrivalB = b.urgency.daysUntilArrival;
  if (arrivalA !== null && arrivalB !== null && arrivalA !== arrivalB) {
    return arrivalA - arrivalB;
  }

  // …then whoever has waited longest…
  const waitA = a.urgency.hoursWaiting;
  const waitB = b.urgency.hoursWaiting;
  if (waitA !== null && waitB !== null && waitA !== waitB) return waitB - waitA;

  // …then newest first, as the inbox normally reads.
  return b.created_at.localeCompare(a.created_at);
}

/** Comparator for "by date": plain newest-first inbox behaviour. */
export function byDate(
  a: { created_at: string },
  b: { created_at: string }
): number {
  return b.created_at.localeCompare(a.created_at);
}
