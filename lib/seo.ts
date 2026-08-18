import type { Metadata } from "next";

import { COMPANY } from "@/app/[lang]/(legal)/company";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

/**
 * Canonical public origin — the base for `metadataBase`, hreflang alternates,
 * the sitemap, robots.txt and JSON-LD `@id`s.
 *
 * Derived from `COMPANY.domain` so there is one place to change the domain.
 * Set `NEXT_PUBLIC_SITE_URL` on preview deployments: without it every preview
 * emits canonicals and hreflang pointing at production, which tells Google to
 * index production copies of preview content.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${COMPANY.domain}`
).replace(/\/+$/, "");

/**
 * Absolute URL for a locale + logical path.
 *   absoluteUrl("es", "/privacy")  ->  https://fondas.app/es/privacy
 *   absoluteUrl("en", "/")         ->  https://fondas.app/en
 * Pass logical paths WITHOUT a locale prefix (same contract as localizedHref).
 */
export function absoluteUrl(locale: Locale, path = "/"): string {
  return `${SITE_URL}/${locale}${path === "/" ? "" : path}`;
}

/**
 * hreflang map for one logical path, for `metadata.alternates.languages`.
 *
 * `x-default` points at the default locale: it is what Google serves when the
 * visitor's language matches none of ours, so it must be a real page, not a
 * language selector we don't have.
 */
export function languageAlternates(path = "/"): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[locale] = absoluteUrl(locale, path);
  languages["x-default"] = absoluteUrl(defaultLocale, path);
  return languages;
}

/** og:locale wants underscores (en_GB), unlike BCP-47 hyphens (en-GB). */
export const ogLocale: Record<Locale, string> = {
  en: "en_GB",
  es: "es_ES",
  ca: "ca_ES",
};

/** Public, indexable paths. Keep in sync with app/sitemap.ts consumers. */
export const PUBLIC_PATHS = ["/", "/sample-brief", "/privacy", "/terms", "/contact"] as const;

/**
 * The complete `openGraph` block for a locale.
 *
 * Next merges metadata per top-level field, NOT deeply: a page that returns
 * `openGraph: { url }` REPLACES the parent's whole openGraph object and
 * silently loses og:type, og:site_name and og:locale. So any page that needs
 * to set even one openGraph field must build the whole thing — call this.
 */
export function openGraphFor(
  locale: Locale,
  {
    title,
    description,
    path,
  }: { title: string; description: string; path?: string }
): Metadata["openGraph"] {
  return {
    type: "website",
    siteName: "Fondas",
    title,
    description,
    locale: ogLocale[locale],
    alternateLocale: locales
      .filter((other) => other !== locale)
      .map((other) => ogLocale[other]),
    ...(path ? { url: absoluteUrl(locale, path) } : {}),
    // og:image is emitted by app/[lang]/opengraph-image.tsx (file convention);
    // setting `images` here would shadow it with a second, stale copy.
  };
}
