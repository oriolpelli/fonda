import { NextResponse } from "next/server";

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
    const content = await generateBriefing(profile.hotel_id);
    return NextResponse.json({ content });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
