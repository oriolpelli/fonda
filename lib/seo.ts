import type { Metadata } from "next";

import { COMPANY } from "@/app/[lang]/(legal)/company";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

/**
 * Canonical public origin — the base for `metadataBase`, hreflang alternates,
 * the sitemap, robots.txt and JSON-LD `@id`s.
 *
 * Resolution order, and why:
 *
 *   1. On a Vercel *preview*, the deployment's own host. A preview must
 *      describe itself, or nothing on it can be verified: robots.txt would
 *      advertise the production sitemap, and canonicals, hreflang and the
 *      JSON-LD `@id`s would all claim to be production. Vercel's
 *      per-environment variables are a single static value, so no dashboard
 *      setting can do this — setting NEXT_PUBLIC_SITE_URL to the production URL
 *      on Preview is identical to leaving it unset, because step 3 already
 *      falls back to exactly that.
 *   2. An explicit NEXT_PUBLIC_SITE_URL — production, or a local override.
 *   3. COMPANY.domain, so the domain has one definition.
 *
 * Step 1 requires "Enable access to System Environment Variables" in Vercel
 * (formerly labelled "Automatically expose System Environment Variables").
 * Without it both NEXT_PUBLIC_VERCEL_* values are undefined and step 3 holds
 * silently — the exact failure this exists to prevent, and invisible from the
 * code. Verify the chain, not the checkbox: on a preview deployment,
 * `curl https://<preview-host>/robots.txt` must report the preview hostname in
 * `Sitemap:` and `Host:`, not fondas.app.
 */

/**
 * The branch URL (`*-git-*.vercel.app`) before the per-deployment URL
 * (`*.vercel.app`): it is stable across pushes, so a preview link keeps working
 * as the branch moves, and it is the one that survives Deployment Protection —
 * Vercel documents VERCEL_URL as unusable with Standard Protection. The
 * deployment URL remains the fallback for CLI deploys, which have no branch.
 *
 * `||`, not `??`: an env var that is present but empty must fall through.
 */
const previewHost =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
    ? process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL
    : undefined;

export const SITE_URL = (
  previewHost
    ? `https://${previewHost}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? `https://${COMPANY.domain}`
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
export const PUBLIC_PATHS = [
  "/",
  "/sample-brief",
  "/trust",
  "/privacy",
  "/terms",
  "/contact",
] as const;

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
