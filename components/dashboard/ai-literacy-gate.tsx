import "server-only";

import { createHash } from "node:crypto";

import { cookies } from "next/headers";

import { AiLiteracyDialog } from "@/components/dashboard/ai-literacy-dialog";
import { AiLiteracyRemember } from "@/components/dashboard/ai-literacy-remember";
import { AI_LITERACY_COOKIE, AI_LITERACY_VERSION } from "@/lib/ai-literacy";
import { createClient } from "@/lib/supabase/server";

/** `version.hash(user)`: this person has seen this version, in this browser. */
export function literacyCookieValue(userId: string): string {
  const who = createHash("sha256").update(userId).digest("hex").slice(0, 12);
  return `${AI_LITERACY_VERSION}.${who}`;
}

/**
 * Decides whether to show "Working with Fondas AI" on this page (A6). Rendered
 * by the dashboard layout inside its own <Suspense> with no fallback, so it
 * never holds the page: the cards arrive a beat after it, if at all.
 *
 * The cheap path first: the cookie says this person has seen this version in
 * this browser → nothing, no database. Otherwise one indexed read of their own
 * rows (RLS). A row for the version (completed or skipped) → nothing to show,
 * but leave the cookie so the next page skips the read. No row → the cards.
 * A read error (0031 not applied yet) → nothing: no record, no cards.
 */
export async function AiLiteracyGate({ userId }: { userId: string }) {
  const value = literacyCookieValue(userId);
  const jar = await cookies();
  if (jar.get(AI_LITERACY_COOKIE)?.value === value) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_literacy_acks")
    .select("id")
    .eq("user_id", userId)
    .eq("version", AI_LITERACY_VERSION)
    .limit(1);
  if (error) return null;
  if ((data ?? []).length > 0) return <AiLiteracyRemember cookieValue={value} />;
  return <AiLiteracyDialog initiallyOpen cookieValue={value} />;
}
