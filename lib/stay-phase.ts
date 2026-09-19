/**
 * Stay phase — where a guest is relative to their booking.
 *
 *   in_house     arrival ≤ today ≤ departure  (hotel-local dates)
 *   pre_arrival  a future reservation — they have not arrived yet
 *   post_stay    a past reservation — they checked out before today
 *   unmatched    no reservation matched at all: general enquiries, suppliers,
 *                people who have not booked, mail we could not link
 *
 * HISTORY, because the shape has been round this loop once. This originally
 * split the inbox in two, then collapsed to a binary (in_house | pre_arrival)
 * when it turned out in-house guests email rarely enough that a second inbox
 * was not worth its own surface (docs/archive/FONDA_REDESIGN_SPEC.md §2). In
 * that binary, "pre_arrival" quietly meant "everything that is not in-house" —
 * a future booking, a past one, and no booking at all, all as one value.
 *
 * W6 splits Communications into two windows (APP_UX_PROPOSAL.md §5.3), and
 * that collapsed value cannot answer the question the split asks. "Upcoming"
 * wants future arrivals; a guest who checked out yesterday and a supplier who
 * never booked are neither upcoming nor in-house, and showing them in a window
 * called Upcoming is how a GM stops trusting the window. So the value is
 * widened rather than reinterpreted: each of the three things "pre_arrival"
 * used to mean now says which one it is.
 *
 * What this is NOT: a change to urgency. lib/email-urgency.ts keys off the
 * arrival DATE, never the phase, so post_stay (arrival in the past) and
 * unmatched (arrival null) fall through its arrival rules exactly as they did
 * when they were both called pre_arrival. Verified by reading, not assumed —
 * see the note in that file.
 *
 * It also still does its quieter original job: picking which of a guest's
 * bookings is the relevant one.
 *
 * It is computed on every read, never stored — a stored phase would be wrong
 * the morning after a guest checks out. What *is* stored (emails.
 * reservation_mews_id) is the durable link to the booking; the dates come from
 * the reservation and "today" comes from the hotel's timezone.
 *
 * Pure and dependency-free so it can be exercised directly.
 */

export type StayPhase =
  | "in_house"
  | "pre_arrival"
  | "post_stay"
  | "unmatched";

/**
 * The calendar date (YYYY-MM-DD) of `instant` in `tz`.
 *
 * Falls back to UTC on an invalid timezone rather than throwing: a single
 * hotel with a bad `hotels.timezone` must never take down a page for everyone
 * (the same failure mode B5 fixed in the briefing cron).
 */
export function localDate(tz: string, instant: Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

/** Today's date (YYYY-MM-DD) in the hotel's timezone. */
export function hotelToday(tz: string | null | undefined): string {
  return localDate(tz || "UTC", new Date());
}

/** The local calendar date of a nullable timestamptz, or null. */
export function localDateOf(
  tz: string,
  timestamp: string | null | undefined
): string | null {
  if (!timestamp) return null;
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? null : localDate(tz, d);
}

/**
 * The boundary rule itself. Dates are YYYY-MM-DD strings, which compare
 * lexicographically in calendar order — no Date arithmetic, no DST edge cases.
 *
 * A guest is in-house on their departure day: they check out during the
 * morning and their requests are still in-stay requests until they do. That is
 * also why post_stay tests `departure < today` rather than `<= today`.
 *
 * Order matters. `unmatched` is checked first because a half-linked booking —
 * an arrival with no departure, or the reverse — cannot be placed on the
 * timeline honestly, and guessing is worse than saying so.
 */
export function stayPhaseFor(
  arrival: string | null,
  departure: string | null,
  today: string
): StayPhase {
  if (!arrival || !departure) return "unmatched";
  if (departure < today) return "post_stay";
  if (arrival > today) return "pre_arrival";
  return "in_house";
}
