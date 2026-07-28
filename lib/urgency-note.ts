import { WAITING_HOURS, type Urgency } from "@/lib/email-urgency";

/**
 * Turning an urgency signal into the short note a human reads — "Complaint",
 * "Arrives today", "Waiting 24h+".
 *
 * It returns a dictionary *key* plus the values to interpolate rather than a
 * finished sentence, so the wording stays in dictionaries/{en,es,ca}.json and
 * this module stays language-free.
 *
 * A neutral module on purpose: the inbox that renders these notes is a
 * `"use client"` component, and the dashboard's "needs a reply" card is a
 * server component. Neither may import from the other (a client module's
 * exports become throwing references on the server), so the shared wording
 * rule lives here, in a module both can safely import.
 */

/** Keys under `dict.emails.urgency`. */
export type UrgencyNoteKey =
  | "complaint"
  | "arrivesToday"
  | "arrivesTomorrow"
  | "arrivesInDays"
  | "waiting";

export interface UrgencyNote {
  key: UrgencyNoteKey;
  vars: Record<string, string | number>;
}

/** Null when the message carries no note — handled mail, or nothing notable. */
export function urgencyNoteFor(urgency: Urgency): UrgencyNote | null {
  if (!urgency.hasNote) return null;

  switch (urgency.kind) {
    case "complaint":
      return { key: "complaint", vars: {} };
    case "arrives_today":
      return { key: "arrivesToday", vars: {} };
    case "arrives_soon":
      return urgency.daysUntilArrival === 1
        ? { key: "arrivesTomorrow", vars: {} }
        : {
            key: "arrivesInDays",
            vars: { count: urgency.daysUntilArrival ?? 0 },
          };
    case "waiting":
      return { key: "waiting", vars: { hours: WAITING_HOURS } };
    default:
      return null;
  }
}
