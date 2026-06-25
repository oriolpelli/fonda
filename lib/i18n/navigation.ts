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
