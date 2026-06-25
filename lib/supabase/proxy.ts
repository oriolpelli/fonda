import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isLocale } from "@/lib/i18n/config";
import { getLocale, LOCALE_COOKIE } from "@/lib/i18n/get-locale";
import type { Database } from "@/types/database";

const LOCALE_COOKIE_OPTS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: "lax" as const,
};

/**
 * Runs on every matched request (Next.js 16's renamed Middleware). Two jobs:
 *
 *   1. i18n routing — if the path has no locale prefix, redirect to the best
 *      locale (cookie → Accept-Language → geo → default) and persist the choice.
 *   2. Auth — refresh the Supabase session and guard protected routes, now
 *      matching the locale-stripped path (`/{locale}/dashboard` → `/dashboard`).
 *
 * `/api` and `/connect` are excluded by the matcher in `proxy.ts`, so they are
 * never locale-redirected and keep handling their own auth.
 *
 * Important: always operate on the same `supabaseResponse` object so refreshed
 * auth cookies propagate to both the browser and the Server Components.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1];

  // 1. No locale in the path → redirect to the detected locale.
  if (!isLocale(firstSegment)) {
    const locale = getLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const res = NextResponse.redirect(url);
    res.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTS);
    return res;
  }

  const locale = firstSegment; // narrowed to Locale by isLocale above
  const rest = pathname.slice(`/${locale}`.length) || "/";

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and getUser(). A simple mistake
  // here can make it very hard to debug random session-logout issues.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected =
    rest.startsWith("/dashboard") || rest.startsWith("/onboarding");
  const isAuthRoute = rest === "/login" || rest === "/signup";

  // Unauthenticated users hitting a protected route → locale-prefixed /login.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated users on an auth page → locale-prefixed dashboard.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Keep the locale cookie aligned with the URL the user is actually on.
  supabaseResponse.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTS);
  return supabaseResponse;
}
