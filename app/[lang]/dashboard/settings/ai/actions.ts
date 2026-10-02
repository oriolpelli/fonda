"use server";

import { getSessionProfile } from "@/lib/auth";
import { AI_LITERACY_VERSION, type LiteracyStatus } from "@/lib/ai-literacy";
import { createClient } from "@/lib/supabase/server";

/**
 * Records that the signed-in person finished — or skipped — the "Working with
 * Fondas AI" cards (AI_ACT_PROMPTS.md A6, Art. 4). Insert-only, through the
 * RLS client: a person can only write a row for themselves in their own
 * hotel, and nobody can change one afterwards (migration 0031).
 *
 * Never throws to the dialog: if the row can't be written (0031 not applied,
 * a network blip) the cards still close, and they will simply be offered
 * again next time — the honest outcome for a record that wasn't kept.
 */
export async function recordAiLiteracy(
  status: LiteracyStatus
): Promise<{ ok: boolean }> {
  if (status !== "completed" && status !== "skipped") return { ok: false };
  const profile = await getSessionProfile();
  if (!profile?.hotelId) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("ai_literacy_acks").insert({
    hotel_id: profile.hotelId,
    user_id: profile.id,
    version: AI_LITERACY_VERSION,
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  });
  if (error) {
    console.error("[ai-literacy] record failed:", error.code);
    return { ok: false };
  }
  return { ok: true };
}
