import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { gmailAuthorizeUrl } from "@/lib/gmail";
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
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?gmail=misconfigured", request.url)
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
