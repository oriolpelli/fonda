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
 * The surface that lists today's movements — arrivals, ETAs, and the check-in
 * chasers.
 *
 * A helper rather than an inline path because W5 renames this route
 * (APP_UX_PROPOSAL.md §5.2) and six call sites point at it: the to-do list, the
 * arrivals, departures and VIP widgets, and whatever W5 adds. One edit here
 * moves all of them.
 */
export function checkinsHref(locale: Locale): string {
  return localizedHref(locale, "/dashboard/checkins");
}

/**
 * The guest inbox, optionally deep-linked to one message.
 *
 * Same reason: W6 scopes Communications into Upcoming and In-house
 * (APP_UX_PROPOSAL.md §5.3), at which point this becomes the scoped route with
 * the `?email=` query intact — and it becomes that everywhere at once.
 */
export function communicationsHref(locale: Locale, emailId?: string): string {
  const base = localizedHref(locale, "/dashboard/communications");
  return emailId ? `${base}?email=${emailId}` : base;
}
