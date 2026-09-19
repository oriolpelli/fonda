"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/**
 * Why a code and not a sentence: this action runs on the server, where there is
 * no locale — `[lang]` is the caller's, not ours — so any string built here is
 * English by construction and an es/ca session would read it in the wrong
 * language. Worse, the save branch used to interpolate `error.message`, putting
 * a raw Postgres string on screen in guest-facing software. The client owns the
 * wording (`dict.briefing.deliveryErrors`); the real reason goes to the server
 * console, where support can find it. Same split as the Home customize panel
 * (components/dashboard/home-customize-panel.tsx).
 *
 * `max` and `email` travel with their code because the translated template
 * interpolates them — `email` is the value the user just typed, echoed back so
 * they can see which row is wrong.
 */
export type BriefDeliveryError =
  | { code: "recipientsUnreadable" }
  | { code: "tooManyRecipients"; max: number }
  | { code: "invalidEmail"; email: string }
  | { code: "invalidSendHour" }
  | { code: "invalidLanguage" }
  | { code: "noHotel" }
  | { code: "saveFailed" };

/**
 * On success the action echoes back what was persisted. The form re-seeds its
 * controlled inputs from this rather than from its server props, so the value
 * on screen is the value in the database — with no dependency on when the
 * re-rendered RSC payload happens to arrive.
 */
export type BriefDeliveryState =
  | { ok: true; saved: { recipients: string[]; sendHour: number; language: string } }
  | { error: BriefDeliveryError }
  | undefined;

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
function parseRecipients(raw: string): string[] | { error: BriefDeliveryError } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: { code: "recipientsUnreadable" } };
  }
  if (!Array.isArray(parsed)) {
    return { error: { code: "recipientsUnreadable" } };
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
    return { error: { code: "tooManyRecipients", max: MAX_RECIPIENTS } };
  }
  for (const email of deduped) {
    if (!EMAIL_RE.test(email)) {
      return { error: { code: "invalidEmail", email } };
    }
  }
  return deduped;
}

/**
 * Saves the Morning Brief's delivery settings: who receives it, at what
 * local hour, and in which language. Reuses `briefing_language` (already on
 * hotel_settings) rather than duplicating it — see docs/archive/FONDA_REDESIGN_SPEC.md §3.2.
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
    return { error: { code: "invalidSendHour" } };
  }

  const language = String(formData.get("language") ?? "").trim();
  if (!LANGUAGES.includes(language as (typeof LANGUAGES)[number])) {
    return { error: { code: "invalidLanguage" } };
  }

  let hotelId: string;
  try {
    hotelId = await requireHotelId();
  } catch (err) {
    // "Not authenticated" and "no hotel" are the same dead end for the user and
    // neither is actionable in the form, so they collapse to one message.
    console.error("[brief] delivery settings: no hotel for session:", err);
    return { error: { code: "noHotel" } };
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
    console.error("[brief] delivery settings save rejected:", error.message);
    return { error: { code: "saveFailed" } };
  }

  // Route paths, not URL paths — the locale is a dynamic `[lang]` segment, so
  // "/dashboard/brief" matches no route and silently revalidates nothing.
  // (Same form the communications action uses.)
  revalidatePath("/[lang]/dashboard/brief", "page");
  revalidatePath("/[lang]/dashboard", "layout");
  return { ok: true, saved: { recipients, sendHour, language } };
}
