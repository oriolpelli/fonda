"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type BriefDeliveryState = { ok: true } | { error: string } | undefined;

const LANGUAGES = ["en", "es", "ca"] as const;
const MAX_RECIPIENTS = 3;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireHotelId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: profile, error } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();
  if (error || !profile) throw new Error("No hotel associated with this user.");
  return profile.hotel_id;
}

/** Trims, dedupes (case-insensitive), caps at 3, and validates recipient emails. */
function parseRecipients(raw: string): string[] | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Couldn't read the recipients list." };
  }
  if (!Array.isArray(parsed)) {
    return { error: "Couldn't read the recipients list." };
  }

  const trimmed = parsed
    .filter((e): e is string => typeof e === "string")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const email of trimmed) {
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(email);
  }

  if (deduped.length > MAX_RECIPIENTS) {
    return { error: `Up to ${MAX_RECIPIENTS} recipients.` };
  }
  for (const email of deduped) {
    if (!EMAIL_RE.test(email)) {
      return { error: `"${email}" doesn't look like a valid email.` };
    }
  }
  return deduped;
}

/**
 * Saves the Morning Brief's delivery settings: who receives it, at what
 * local hour, and in which language. Reuses `briefing_language` (already on
 * hotel_settings) rather than duplicating it — see FONDA_REDESIGN_SPEC §3.2.
 */
export async function updateBriefDeliverySettings(
  _prevState: BriefDeliveryState,
  formData: FormData
): Promise<BriefDeliveryState> {
  const recipients = parseRecipients(String(formData.get("recipients") ?? "[]"));
  if (!Array.isArray(recipients)) {
    return recipients;
  }

  const sendHourRaw = String(formData.get("sendHour") ?? "").trim();
  const sendHour = Number.parseInt(sendHourRaw, 10);
  if (!Number.isInteger(sendHour) || sendHour < 0 || sendHour > 23) {
    return { error: "Choose a valid send hour." };
  }

  const language = String(formData.get("language") ?? "").trim();
  if (!LANGUAGES.includes(language as (typeof LANGUAGES)[number])) {
    return { error: "Choose a brief language." };
  }

  let hotelId: string;
  try {
    hotelId = await requireHotelId();
  } catch (err) {
    return { error: (err as Error).message };
  }

  // hotel_settings is client-writable for hotel members (RLS), so the session
  // client can update it directly.
  const supabase = await createClient();
  const { error } = await supabase
    .from("hotel_settings")
    .update({
      brief_recipients: recipients as unknown as Json,
      brief_send_hour: sendHour,
      briefing_language: language,
    })
    .eq("hotel_id", hotelId);
  if (error) {
    return { error: `Couldn't save settings: ${error.message}` };
  }

  revalidatePath("/dashboard/brief");
  revalidatePath("/dashboard");
  return { ok: true };
}
