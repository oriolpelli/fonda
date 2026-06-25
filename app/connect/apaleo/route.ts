import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { APALEO_AUTHORIZE_URL } from "@/lib/apaleo";
import { localeFromRequestCookie } from "@/lib/i18n/get-locale";
import { localizedHref } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_SCOPES =
  "offline_access reservations.read rateplans.read setup.read";

export function apaleoRedirectUri(request: Request): string {
  return (
    process.env.APALEO_REDIRECT_URI ??
    `${new URL(request.url).origin}/connect/apaleo/callback`
  );
}

/**
 * Starts the Apaleo OAuth2 authorization-code flow: sets a CSRF `state` cookie
 * and redirects the GM to Apaleo's consent screen.
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

  const clientId = process.env.APALEO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL(
        `${localizedHref(locale, "/dashboard/settings")}?apaleo=misconfigured`,
        request.url
      )
    );
  }

  const state = randomBytes(16).toString("hex");
  const authorizeUrl = new URL(APALEO_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", apaleoRedirectUri(request));
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set(
    "scope",
    process.env.APALEO_SCOPES ?? DEFAULT_SCOPES
  );
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("apaleo_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/connect/apaleo",
    maxAge: 600,
  });
  return response;
}
