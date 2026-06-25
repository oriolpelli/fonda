import { NextResponse } from "next/server";

import { gmailRedirectUri } from "@/app/connect/gmail/route";
import {
  createGmailClient,
  exchangeGmailCode,
  ingestRecentEmails,
  storeGmailCredentials,
} from "@/lib/gmail";
import { localeFromRequestCookie } from "@/lib/i18n/get-locale";
import { localizedHref } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // ingesting 7 days of email can take a moment

function settingsRedirect(request: Request, params: string): NextResponse {
  const locale = localeFromRequestCookie(request);
  const response = NextResponse.redirect(
    new URL(
      `${localizedHref(locale, "/dashboard/settings")}?${params}`,
      request.url
    )
  );
  response.cookies.delete("gmail_oauth_state");
  return response;
}

/**
 * Gmail OAuth2 redirect target. Verifies CSRF state, exchanges the code,
 * stores the encrypted refresh token + connected address, then ingests the
 * last 7 days of inbox email.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return settingsRedirect(request, "gmail=denied");
  }

  const expectedState = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)gmail_oauth_state=([^;]+)/)?.[1];
  if (!code || !state || !expectedState || state !== expectedState) {
    return settingsRedirect(request, "gmail=invalid_state");
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
    return settingsRedirect(request, "gmail=no_hotel");
  }

  let ingested = 0;
  try {
    const { refreshToken } = await exchangeGmailCode(
      code,
      gmailRedirectUri(request)
    );

    // Read the connected address, then persist credentials.
    const email = await createGmailClient(refreshToken)
      .getProfileEmail()
      .catch(() => "");
    await storeGmailCredentials(profile.hotel_id, refreshToken, email);

    ingested = await ingestRecentEmails(profile.hotel_id, 7);
  } catch {
    return settingsRedirect(request, "gmail=error");
  }

  return settingsRedirect(request, `gmail=connected&ingested=${ingested}`);
}
