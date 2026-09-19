/**
 * Which half of the day the arrivals page is showing.
 *
 * A plain module, like `lib/inbox-sort.ts` and for the same reason: the value
 * is read on the server (the page parses `?tab=`, the tab strip renders the
 * selected one) and named on the client (`lib/i18n/navigation.ts` builds hrefs
 * for widgets that are client components). No React, no `next/headers`, no
 * browser globals — so it can be imported from either side.
 *
 * The tab lives in the URL rather than a cookie: unlike the inbox sort, which
 * is a standing preference, this is a place. "Show me the departures" is a link
 * a GM sends, bookmarks, and lands on from the Home widget's "+N more".
 */

export const ARRIVALS_TABS = ["arrivals", "departures"] as const;

export type ArrivalsTab = (typeof ARRIVALS_TABS)[number];

/** Anything else — a typo, a stale link — falls back to arrivals. */
export function isArrivalsTab(value: string | undefined): value is ArrivalsTab {
  return value === "arrivals" || value === "departures";
}
