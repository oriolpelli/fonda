/**
 * The inbox sort contract, shared by the server page and the client inbox.
 *
 * This lives in its own plain module for a reason: these values are read on
 * BOTH sides of the server/client boundary — the page reads the cookie while
 * rendering on the server, the inbox toggles it in the browser. Exporting them
 * from `components/dashboard/email-inbox.tsx` (a `"use client"` module) made
 * every one of them a *client reference* on the server, so calling
 * `isSortMode()` from the page threw at render time:
 *
 *   Attempted to call isSortMode() from the server but isSortMode is on the
 *   client. It's not possible to invoke a client function from the server.
 *
 * Neither `tsc` nor `next build` catches that — it only fires when the page
 * actually renders. A module with no `"use client"` and no `server-only` can
 * be imported safely from either side; keep it that way (no React, no
 * `next/headers`, no browser globals).
 */

export const SORT_MODES = ["date", "urgency"] as const;

export type SortMode = (typeof SORT_MODES)[number];

/** Remembered across visits so the toggle doesn't reset every morning. */
export const SORT_COOKIE = "fondas_inbox_sort";

export function isSortMode(value: string | undefined): value is SortMode {
  return value === "date" || value === "urgency";
}
