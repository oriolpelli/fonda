import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { gmailAuthorizeUrl } from "@/lib/gmail";
import { localeFromRequestCookie } from "@/lib/i18n/get-locale";
import { localizedHref } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export function gmailRedirectUri(request: Request): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    `${new URL(request.url).origin}/connect/gmail/callback`
  );
}

/**
 * Starts the Gmail OAuth2 flow: sets a CSRF `state` cookie and redirects the GM
 * to Google's consent screen.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = localeFromRequestCookie(request);
  if (!user) {
    return NextResponse.redirect(
      new URL(localizedHref(locale, "/login"), request.url)
    );
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(
      new URL(
        `${localizedHref(locale, "/dashboard/settings")}?gmail=misconfigured`,
        request.url
      )
    );
  }

  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(
    gmailAuthorizeUrl(gmailRedirectUri(request), state)
  );
  response.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/connect/gmail",
    maxAge: 600,
  });
  return response;
}
