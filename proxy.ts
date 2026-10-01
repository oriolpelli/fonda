import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renamed Middleware to "Proxy" (same functionality, runs before a
 * request is completed). This refreshes the Supabase session and guards the
 * protected `/dashboard` routes.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    {
      /*
       * Match all request paths except for the ones starting with:
       * - api, connect (endpoints / OAuth callbacks — not localized pages)
       * - _next/static (static files)
       * - _next/image (image optimization files)
       * - favicon.ico, sitemap.xml, robots.txt, and common static asset extensions
       */
      source:
        "/((?!api|connect|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      /*
       * …and skip link PREFETCHES (the documented Next.js pattern). The sidebar
       * prefetches every visible link, and each prefetch used to run the whole
       * proxy — a session check against Supabase per link, per page view —
       * for a response that is only the route's loading skeleton. Real
       * navigations still go through here, refresh the session and are
       * guarded; the dashboard layout re-checks auth on every render anyway.
       */
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
