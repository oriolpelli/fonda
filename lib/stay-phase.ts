/**
 * Stay phase — where a guest is relative to their booking.
 *
 *   in_house     arrival ≤ today ≤ departure  (hotel-local dates)
 *   pre_arrival  everything else — a future reservation, a past one, or no
 *                matched reservation at all (general enquiries, non-guests)
 *
 * This once split the inbox in two (FONDA_REDESIGN_SPEC.md §2). In-house guests
 * email rarely enough that the split wasn't worth it, so today it does a
 * quieter job: picking which of a guest's bookings is the relevant one, and
 * feeding the arrival-based urgency rules in lib/email-urgency.ts.
 *
 * It is computed on every read, never stored — a stored phase would be wrong
 * the morning after a guest checks out. What *is* stored (emails.
 * reservation_mews_id) is the durable link to the booking; the dates come from
 * the reservation and "today" comes from the hotel's timezone.
 *
 * Pure and dependency-free so it can be exercised directly.
 */

export type StayPhase = "in_house" | "pre_arrival";

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
 * morning and their requests are still in-stay requests until they do.
 */
export function stayPhaseFor(
  arrival: string | null,
  departure: string | null,
  today: string
): StayPhase {
  if (!arrival || !departure) return "pre_arrival";
  return arrival <= today && today <= departure ? "in_house" : "pre_arrival";
}
