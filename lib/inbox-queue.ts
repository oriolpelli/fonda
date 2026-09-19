/**
 * The inbox queue contract (APP_UX_PROPOSAL.md §5.3, "Queue framing over
 * sort"), shared by the server page and the client inbox.
 *
 * Same rule as lib/inbox-sort.ts, and for the same reason: these values are
 * read on BOTH sides of the server/client boundary, so this module carries no
 * `"use client"`, no `server-only`, no React, no `next/headers` and no browser
 * globals. Exporting them from a `"use client"` module turns each one into a
 * client reference and the server call throws at render — something neither
 * `tsc` nor `next build` catches.
 *
 * QUEUES ARE FILTERS, NOT A PARTITION. A message sent an hour ago is both
 * "waiting" (they have not replied) and "done today" (you dealt with it). That
 * overlap is intended: `done_today` is a progress counter, not a bucket, and a
 * GM wants to see the number go up. `all` exists so nothing is ever unreachable
 * — see the note on `done_today` for the one case that needs it.
 */

export const QUEUE_MODES = [
  "needs_you",
  "waiting",
  "done_today",
  "all",
] as const;

export type QueueMode = (typeof QUEUE_MODES)[number];

/** Remembered across visits, exactly as the sort is. */
export const QUEUE_COOKIE = "fondas_inbox_queue";

/** A queue can be emptied — that is the point — so this is the one to open on. */
export const DEFAULT_QUEUE: QueueMode = "needs_you";

export function isQueueMode(value: string | undefined): value is QueueMode {
  return (QUEUE_MODES as readonly string[]).includes(value ?? "");
}

/** How long a sent message counts as "waiting" on the guest. */
export const WAITING_WINDOW_HOURS = 72;

/** The fields a queue decision needs. Structural, so both InboxEmail types fit. */
export interface QueueInput {
  status: string;
  sent_at: string | null;
}

/**
 * Whether a message belongs in a queue.
 *
 * `today` is the hotel-local calendar date and `now` is injected, so this stays
 * pure and the 72-hour boundary can be exercised directly.
 *
 * ON `done_today` AND IGNORED MAIL — decision P-7 in APP_UX_PROPOSAL.md §11.
 * `emails` has `created_at` and `sent_at` and no `updated_at`, so the moment a
 * message was IGNORED is not recorded anywhere. "Done today" therefore counts
 * what was sent today and cannot count what was ignored today without
 * inventing a date, which would make the one number on screen a lie.
 *
 * That leaves ignored mail in no queue at all — invisible rather than merely
 * uncounted — which is why `all` exists. The alternative was a migration to add
 * `updated_at`, and that is the right long-term fix; it is not worth blocking
 * the queue framing on, and P-7 records it as owed.
 */
export function matchesQueue(
  email: QueueInput,
  queue: QueueMode,
  today: string,
  sentAtLocalDate: (sentAt: string) => string | null,
  now: Date = new Date()
): boolean {
  switch (queue) {
    case "all":
      return true;
    case "needs_you":
      return email.status === "pending" || email.status === "needs_attention";
    case "waiting": {
      if (email.status !== "sent" || !email.sent_at) return false;
      const hours = (now.getTime() - Date.parse(email.sent_at)) / 3_600_000;
      return Number.isFinite(hours) && hours >= 0 && hours <= WAITING_WINDOW_HOURS;
    }
    case "done_today":
      if (email.status !== "sent" || !email.sent_at) return false;
      return sentAtLocalDate(email.sent_at) === today;
  }
}
