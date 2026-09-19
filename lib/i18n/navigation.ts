import { type ArrivalsTab } from "@/lib/arrivals-tab";

import { type Locale } from "./config";

/**
 * Prefixes an app-internal path with the locale segment.
 *   localizedHref("es", "/dashboard")  -> "/es/dashboard"
 *   localizedHref("es", "/")           -> "/es"
 *
 * Pass logical paths WITHOUT a locale prefix. External URLs, hashes, and
 * already-localized paths should not be passed here.
 */
export function localizedHref(locale: Locale, path: string): string {
  if (!path.startsWith("/")) return path; // hash links, external, etc.
  const clean = path === "/" ? "" : path;
  return `/${locale}${clean}`;
}

/** Strips a leading locale segment from a pathname, returning the rest. */
export function stripLocale(pathname: string): string {
  const rest = pathname.replace(/^\/(en|es|ca)(?=\/|$)/, "");
  return rest === "" ? "/" : rest;
}

/**
 * The surface that lists today's movements — arrivals, ETAs, the check-in
 * chasers, and today's departures (APP_UX_PROPOSAL.md §5.2).
 *
 * A helper rather than an inline path, which is what made the W5 rename from
 * `/dashboard/checkins` one edit rather than six: the to-do list, the arrivals,
 * departures and VIP widgets and the Morning Brief all come through here.
 *
 * `tab` names the half of the day the caller means. It is omitted for arrivals
 * because the page defaults to them — a link with no opinion should not carry
 * one, and `?tab=arrivals` in every href would be noise in the address bar.
 */
export function arrivalsHref(locale: Locale, tab?: ArrivalsTab): string {
  const base = localizedHref(locale, "/dashboard/arrivals");
  return tab === "departures" ? `${base}?tab=departures` : base;
}

/**
 * One guest's record.
 *
 * Guests v1 hasn't shipped — the route is a stub — but the arrivals and
 * departures lists link to it anyway (§5.2): the link is the right destination
 * today and stops being a stub without a single call site changing.
 */
export function guestHref(locale: Locale, customerMewsId: string): string {
  return localizedHref(
    locale,
    `/dashboard/guests/${encodeURIComponent(customerMewsId)}`
  );
}

/**
 * The guest inbox, optionally deep-linked to one message.
 *
 * W6 scoped Communications into two windows (APP_UX_PROPOSAL.md §5.3), and this
 * still points at the unscoped parent — deliberately, which is the opposite of
 * what the note here used to promise.
 *
 * The parent is a redirect that works out which window owns a message and
 * forwards the whole query string. Sending callers there is not a missing
 * update: which window a message belongs to depends on the guest's stay dates
 * relative to today, so it is a fact about *now*, not about the link. A to-do
 * written this morning for a guest arriving tomorrow points into Upcoming; the
 * same link opened the day after tomorrow should open In-house, because by then
 * that is where the message is. Resolving the window at link-creation time
 * would bake in an answer that expires overnight — and these links outlive the
 * page that made them, in bookmarks and in mail.
 *
 * The cost is one extra hop and one `loadInbox` on the parent. The benefit is
 * that a link is never wrong, and that there is exactly one place — the parent
 * route — that knows how phases map to windows.
 *
 * Link straight to a scoped route only when the destination is the WINDOW
 * rather than a message: a nav row, or a "back to the inbox" affordance.
 */
export function communicationsHref(locale: Locale, emailId?: string): string {
  const base = localizedHref(locale, "/dashboard/communications");
  return emailId ? `${base}?email=${emailId}` : base;
}
