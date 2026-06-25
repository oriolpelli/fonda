/**
 * Single source of truth for Fonda's supported locales. Dependency-free and
 * safe to import from anywhere — the proxy, server components, and client
 * components all use this (it must NOT pull in `server-only` or the JSON
 * dictionaries). See FONDA i18n: URL-path locales `/en`, `/es`, `/ca`.
 */
export const locales = ["en", "es", "ca"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Display labels for the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  ca: "Català",
};

/** Short labels (segmented switcher). */
export const localeShortNames: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  ca: "CA",
};

/**
 * BCP-47 tags for `Intl.*` formatting (dates, numbers). Distinct from the URL
 * locale segment, which stays the short form.
 */
export const intlLocale: Record<Locale, string> = {
  en: "en-GB",
  es: "es-ES",
  ca: "ca-ES",
};
