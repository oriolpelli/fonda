import { NextResponse } from "next/server";

import {
  APALEO_RETURN_COOKIE,
  apaleoRedirectUri,
} from "@/app/connect/apaleo/route";
import { exchangeApaleoCode, storeApaleoCredentials } from "@/lib/apaleo";
import { localeFromRequestCookie } from "@/lib/i18n/get-locale";
import { localizedHref } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Back where the GM started, with the outcome in `?apaleo=`.
 *
 * Normally Settings. If the round-trip began inside the setup wizard, the
 * cookie set by /connect/apaleo sends them back into it — otherwise connecting
 * a PMS mid-setup would silently drop them out of the flow. The destination is
 * chosen from a fixed pair here; nothing from the request can steer it.
 */
function returnRedirect(request: Request, status: string): NextResponse {
  const locale = localeFromRequestCookie(request);
  const fromOnboarding =
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)apaleo_oauth_return=([^;]+)/)?.[1] === "onboarding";
  const path = fromOnboarding ? "/onboarding/connect" : "/dashboard/settings";

  const response = NextResponse.redirect(
    new URL(`${localizedHref(locale, path)}?apaleo=${status}`, request.url)
  );
  // Both cookies have served their purpose.
  response.cookies.delete("apaleo_oauth_state");
  response.cookies.delete(APALEO_RETURN_COOKIE);
  return response;
}

/**
 * Apaleo OAuth2 redirect target. Verifies the CSRF state, exchanges the code
 * for tokens, and stores the (encrypted) refresh token against the hotel.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return returnRedirect(request, "denied");
  }

  const expectedState = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)apaleo_oauth_state=([^;]+)/)?.[1];
  if (!code || !state || !expectedState || state !== expectedState) {
    return returnRedirect(request, "invalid_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(localizedHref(localeFromRequestCookie(request), "/login"), request.url)
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return returnRedirect(request, "no_hotel");
  }

  try {
    const { refreshToken } = await exchangeApaleoCode(
      code,
      apaleoRedirectUri(request)
    );
    await storeApaleoCredentials(profile.hotel_id, { refreshToken });
  } catch {
    return returnRedirect(request, "error");
  }

  return returnRedirect(request, "connected");
}
