import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Who is signed in, and which hotel they belong to — resolved ONCE per request.
 *
 * Before this, the dashboard layout, the page under it and several loaders each
 * asked Supabase Auth "who is this?" over the network (`getUser()`), then each
 * looked the user's row up again. On a hard load that was three or four auth
 * round trips plus as many `users` reads before any real data was fetched.
 *
 * Two changes:
 *
 *   • `getClaims()` instead of `getUser()`. It verifies the session JWT's
 *     signature — locally, against Supabase's published keys (cached per
 *     process), when the project uses asymmetric JWT signing keys; when it
 *     still uses the legacy shared secret it falls back to the same network
 *     check `getUser()` makes. Either way the identity is verified, never just
 *     decoded. Supabase recommends getClaims() for exactly this.
 *   • React `cache()`, so every server component in one render shares one
 *     answer. Server actions and route handlers are their own requests and
 *     simply call through.
 *
 * Authorization is unchanged: every table is still scoped by RLS on the
 * caller's JWT. This only decides who the caller is.
 */

export interface SessionUser {
  id: string;
  /** From the verified JWT. Only ever shown back to its owner. */
  email: string | null;
}

export interface SessionProfile extends SessionUser {
  /** Null for a signed-up user who hasn't finished onboarding. */
  hotelId: string | null;
  role: Database["public"]["Enums"]["user_role"] | null;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
});

export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const user = await getSessionUser();
    if (!user) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .from("users")
      .select("hotel_id, role")
      .eq("id", user.id)
      .maybeSingle();
    return {
      ...user,
      hotelId: data?.hotel_id ?? null,
      role: data?.role ?? null,
    };
  }
);

/**
 * The signed-in user's hotel row — read ONCE per request, like the session.
 *
 * Before 1 Oct the dashboard read `hotels` four times on a click into Home and
 * six times on a hard load — the layout, the badge loader, the inbox, the
 * snapshot, the movements and sync health each asked again, several of them
 * as the first step of a chain (docs/audits/2026-10-01-performance.md §4.3).
 *
 * RLS-scoped (`hotels: read own`), so it needs no id and can start at the same
 * moment as getSessionProfile() instead of after it. Null when signed out or
 * not yet onboarded. The columns are the union of what the dashboard reads;
 * the encrypted credential columns are never selectable by a signed-in user
 * (migrations 0002, 0006) and are not in this list.
 *
 * Render-scoped like everything here: a server action or route handler that
 * calls it simply reads the row.
 */
const HOTEL_COLUMNS =
  "id, name, timezone, rooms_count, pms_type, pms_connected, last_synced_at, gmail_email";

export type SessionHotel = Pick<
  Database["public"]["Tables"]["hotels"]["Row"],
  | "id"
  | "name"
  | "timezone"
  | "rooms_count"
  | "pms_type"
  | "pms_connected"
  | "last_synced_at"
  | "gmail_email"
>;

export const getHotel = cache(async (): Promise<SessionHotel | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hotels")
    .select(HOTEL_COLUMNS)
    .maybeSingle();
  return data ?? null;
});
