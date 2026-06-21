import { NextResponse } from "next/server";

import { apaleoRedirectUri } from "@/app/connect/apaleo/route";
import { exchangeApaleoCode, storeApaleoCredentials } from "@/lib/apaleo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function settingsRedirect(request: Request, status: string): NextResponse {
  const response = NextResponse.redirect(
    new URL(`/dashboard/settings?apaleo=${status}`, request.url)
  );
  // The state cookie has served its purpose.
  response.cookies.delete("apaleo_oauth_state");
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
    return settingsRedirect(request, "denied");
  }

  const expectedState = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)apaleo_oauth_state=([^;]+)/)?.[1];
  if (!code || !state || !expectedState || state !== expectedState) {
    return settingsRedirect(request, "invalid_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return settingsRedirect(request, "no_hotel");
  }

  try {
    const { refreshToken } = await exchangeApaleoCode(
      code,
      apaleoRedirectUri(request)
    );
    await storeApaleoCredentials(profile.hotel_id, { refreshToken });
  } catch {
    return settingsRedirect(request, "error");
  }

  return settingsRedirect(request, "connected");
}
