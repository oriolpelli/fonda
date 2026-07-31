import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * `/dashboard` and `/onboarding` are behind auth (proxy.ts) so a crawler only
 * ever sees a redirect, but disallowing them keeps those redirects out of
 * crawl budget. `/api` and `/connect` are endpoints and OAuth callbacks, never
 * pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/onboarding/", "/api/", "/connect/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
