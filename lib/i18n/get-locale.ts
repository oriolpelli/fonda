import { type NextRequest } from "next/server";

import { defaultLocale, isLocale, type Locale } from "./config";

export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Reads the persisted locale from a plain `Request`'s Cookie header. Used by
 * the OAuth callback route handlers (which live outside `[lang]` and so have no
 * locale in their URL) to localize their redirect targets.
 */
export function localeFromRequestCookie(request: Request): Locale {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const value = match?.[1];
  return isLocale(value) ? value : defaultLocale;
}

/**
 * Picks the best locale for an incoming request, in priority order:
 *   1. `NEXT_LOCALE` cookie (an explicit prior choice)
 *   2. `Accept-Language` header (the browser's configured languages)
 *   3. Vercel IP region as a Catalan tiebreaker (Catalonia / Balearics /
 *      Valencia region codes) — only when language headers gave nothing usable
 *   4. defaultLocale
 *
 * Hand-rolled (no negotiator/intl-localematcher deps) — there are only 3 locales.
 */
export function getLocale(request: NextRequest): Locale {
  // 1. Explicit cookie wins.
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;

  // 2. Accept-Language, ranked by q-value.
  const header = request.headers.get("accept-language");
  if (header) {
    const ranked = header
      .split(",")
      .map((part) => {
        const [tag, q] = part.trim().split(";q=");
        return {
          base: tag.split("-")[0].toLowerCase(),
          q: q ? parseFloat(q) : 1,
        };
      })
      .sort((a, b) => b.q - a.q);
    for (const { base } of ranked) {
      if (isLocale(base)) return base;
    }
  }

  // 3. Catalan tiebreaker via Vercel geo (only if no language match above).
  const region = request.headers.get("x-vercel-ip-country-region");
  const country = request.headers.get("x-vercel-ip-country");
  if (country === "ES" && region && /^(CT|IB|VC)$/i.test(region)) {
    return "ca";
  }

  // 4. Fallback.
  return defaultLocale;
}
