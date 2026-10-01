import { NextResponse } from "next/server";

import { classifyAiError } from "@/lib/ai-errors";
import { generateBriefing } from "@/lib/briefing";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Briefing generation calls the Claude API — allow generous headroom.
export const maxDuration = 60;

/**
 * Regenerates today's briefing for the authenticated user's hotel and returns
 * it. Used by the dashboard's Refresh button and the "generating" state.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();
  if (error || !profile) {
    return NextResponse.json(
      { error: "No hotel associated with this user." },
      { status: 400 }
    );
  }

  try {
    // Reached from the dashboard, so this is a GM asking for a brief now.
    const content = await generateBriefing(profile.hotel_id, "manual");
    return NextResponse.json({ content });
  } catch (err) {
    // A code, never the provider's text (lib/ai-errors.ts). A failure that
    // wasn't the model's — a database write, say — is logged here and gets
    // the generic "couldn't generate" message on screen.
    const code = classifyAiError(err, "briefing");
    if (!code) console.error("[briefing] manual generation failed:", err);
    return NextResponse.json({ error: code ?? "failed" }, { status: 502 });
  }
}
