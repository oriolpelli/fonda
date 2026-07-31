import type { MetadataRoute } from "next";

import { locales } from "@/lib/i18n/config";
import { absoluteUrl, languageAlternates, PUBLIC_PATHS } from "@/lib/seo";

/**
 * One entry per locale × public path, each carrying the full hreflang map so
 * Google can cluster the three language versions.
 *
 * Deliberately excluded: /login, /signup (thin, no search intent), and
 * everything under /dashboard, /onboarding, /api and /connect — those are
 * private or non-page routes and are disallowed in robots.ts.
 */
const PRIORITY: Record<string, number> = {
  "/": 1,
  "/sample-brief": 0.7,
  "/privacy": 0.3,
  "/terms": 0.3,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.flatMap((path) =>
    locales.map((locale) => ({
      url: absoluteUrl(locale, path),
      lastModified,
      changeFrequency: (path === "/" ? "weekly" : "monthly") as
        | "weekly"
        | "monthly",
      priority: PRIORITY[path] ?? 0.5,
      alternates: { languages: languageAlternates(path) },
    }))
  );
}
