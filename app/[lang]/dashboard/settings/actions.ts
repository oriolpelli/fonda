"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";

import {
  MewsApiError,
  storeMewsCredentials,
  verifyMewsCredentials,
} from "@/lib/mews";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { RoomType, Upsell } from "@/types";
import type { Json } from "@/types/database";

export type ConnectState =
  | { ok: true; message: string }
  | { error: string }
  | undefined;

export type HotelDetailsState = { ok: true } | { error: string } | undefined;

export async function updateHotelDetails(
  _prevState: HotelDetailsState,
  formData: FormData
): Promise<HotelDetailsState> {
  const name = String(formData.get("name") ?? "").trim();
  const roomsRaw = String(formData.get("roomsCount") ?? "").trim();

  if (!name) {
    return { error: "Enter your hotel name." };
  }
  const rooms = Number.parseInt(roomsRaw, 10);
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > 1000) {
    return { error: "Number of rooms must be between 1 and 1000." };
  }

  let hotelId: string;
  try {
    hotelId = await requireHotelId();
  } catch (err) {
    return { error: (err as Error).message };
  }

  // Session client respects RLS (hotel updates are owner-only). The .select()
  // lets us detect when RLS filtered the row out (i.e. a non-owner).
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hotels")
    .update({ name, rooms_count: rooms })
    .eq("id", hotelId)
    .select("id");
  if (error) {
    return { error: `Couldn't save: ${error.message}` };
  }
  if (!data || data.length === 0) {
    return { error: "Only the hotel owner can change hotel details." };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type GmNameState = { ok: true } | { error: string } | undefined;

// Brief recipients / send hour / language moved to the Morning Brief page's
// own Settings panel (app/[lang]/dashboard/brief/actions.ts) — see Task B1.
// This action now only handles the GM name, used to sign briefings and email
// drafts (lib/briefing.ts, lib/email-processor.ts).
export async function updateGmName(
  _prevState: GmNameState,
  formData: FormData
): Promise<GmNameState> {
  const gmName = String(formData.get("gmName") ?? "").trim();

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
    .update({ gm_name: gmName || null })
    .eq("hotel_id", hotelId);
  if (error) {
    return { error: `Couldn't save settings: ${error.message}` };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type HotelProfileState = { ok: true } | { error: string } | undefined;

function parseRoomTypes(raw: string): RoomType[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (r): r is RoomType =>
        !!r &&
        typeof r === "object" &&
        typeof (r as RoomType).name === "string" &&
        typeof (r as RoomType).category === "string"
    )
    .map((r) => ({
      name: r.name.trim(),
      count: Number.isFinite(r.count) && r.count >= 0 ? Math.trunc(r.count) : 0,
      category: r.category.trim(),
    }))
    .filter((r) => r.name.length > 0)
    .slice(0, 30);
}

const UPSELL_KEYS: Upsell["key"][] = [
  "late_checkout",
  "breakfast",
  "transfer",
  "parking",
  "custom",
];

function parseUpsells(raw: string): Upsell[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (u): u is Upsell =>
        !!u &&
        typeof u === "object" &&
        typeof (u as Upsell).label === "string" &&
        typeof (u as Upsell).price === "string"
    )
    .map((u) => ({
      key: UPSELL_KEYS.includes(u.key) ? u.key : "custom",
      label: u.label.trim(),
      price: u.price.trim(),
      notes:
        typeof u.notes === "string" && u.notes.trim().length > 0
          ? u.notes.trim()
          : undefined,
      active: u.active !== false,
    }))
    .filter((u) => u.label.length > 0)
    .slice(0, 20);
}

export async function updateHotelProfile(
  _prevState: HotelProfileState,
  formData: FormData
): Promise<HotelProfileState> {
  const text = (key: string) => String(formData.get(key) ?? "").trim() || null;

  const starRatingRaw = String(formData.get("starRating") ?? "").trim();
  let starRating: number | null = null;
  if (starRatingRaw) {
    starRating = Number.parseInt(starRatingRaw, 10);
    if (!Number.isInteger(starRating) || starRating < 1 || starRating > 5) {
      return { error: "Star rating must be between 1 and 5." };
    }
  }

  const timePattern = /^\d{2}:\d{2}$/;
  const checkInRaw = String(formData.get("checkInTime") ?? "").trim();
  const checkOutRaw = String(formData.get("checkOutTime") ?? "").trim();
  if (checkInRaw && !timePattern.test(checkInRaw)) {
    return { error: "Enter a valid check-in time." };
  }
  if (checkOutRaw && !timePattern.test(checkOutRaw)) {
    return { error: "Enter a valid check-out time." };
  }

  const roomTypes = parseRoomTypes(String(formData.get("roomTypes") ?? "[]"));
  const upsells = parseUpsells(String(formData.get("upsells") ?? "[]"));

  let hotelId: string;
  try {
    hotelId = await requireHotelId();
  } catch (err) {
    return { error: (err as Error).message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("hotel_settings")
    .update({
      star_rating: starRating,
      property_type: text("propertyType"),
      check_in_time: checkInRaw || null,
      check_out_time: checkOutRaw || null,
      policies: text("policies"),
      positioning_vibe: text("positioningVibe"),
      target_guest: text("targetGuest"),
      local_recommendations: text("localRecommendations"),
      preferred_greeting: text("preferredGreeting"),
      signoff_name: text("signoffName"),
      languages_spoken: text("languagesSpoken"),
      parking_transport: text("parkingTransport"),
      wifi_info: text("wifiInfo"),
      breakfast_info: text("breakfastInfo"),
      room_types: roomTypes as unknown as Json,
      upsells: upsells as unknown as Json,
    })
    .eq("hotel_id", hotelId);
  if (error) {
    return { error: `Couldn't save settings: ${error.message}` };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type TripAdvisorState =
  | { ok: true; summary: string | null }
  | { error: string }
  | undefined;

export async function summarizeReviews(
  _prevState: TripAdvisorState,
  formData: FormData
): Promise<TripAdvisorState> {
  const tripadvisorUrl = String(formData.get("tripadvisorUrl") ?? "").trim();
  const reviewHighlights = String(formData.get("reviewHighlights") ?? "")
    .trim()
    .slice(0, 6000);

  let hotelId: string;
  try {
    hotelId = await requireHotelId();
  } catch (err) {
    return { error: (err as Error).message };
  }

  let reviewSummary: string | null = null;
  if (reviewHighlights) {
    try {
      const client = new Anthropic();
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        output_config: { effort: "low" },
        system:
          "Condense these pasted guest reviews into a short, upbeat 2-3 sentence " +
          "summary of what guests consistently praise. Use only what's in the " +
          "text — never invent details. Output plain prose, no bullet points, " +
          "no preamble.",
        messages: [{ role: "user", content: reviewHighlights }],
      });
      const block = response.content.find((b) => b.type === "text");
      reviewSummary = block && block.type === "text" ? block.text.trim() : null;
    } catch (err) {
      return { error: `Couldn't summarize reviews: ${(err as Error).message}` };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("hotel_settings")
    .update({
      tripadvisor_url: tripadvisorUrl || null,
      review_highlights: reviewHighlights || null,
      review_summary: reviewSummary,
    })
    .eq("hotel_id", hotelId);
  if (error) {
    return { error: `Couldn't save: ${error.message}` };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, summary: reviewSummary };
}

async function requireHotelId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();
  if (error || !profile) {
    throw new Error("No hotel associated with this user.");
  }
  return profile.hotel_id;
}

export async function connectMews(
  _prevState: ConnectState,
  formData: FormData
): Promise<ConnectState> {
  const clientToken = String(formData.get("clientToken") ?? "").trim();
  const accessToken = String(formData.get("accessToken") ?? "").trim();

  if (!clientToken || !accessToken) {
    return { error: "Enter both the Client token and the Access token." };
  }

  let hotelId: string;
  try {
    hotelId = await requireHotelId();
  } catch (err) {
    return { error: (err as Error).message };
  }

  // Validate the tokens against MEWS before persisting them.
  try {
    await verifyMewsCredentials({ clientToken, accessToken });
  } catch (err) {
    if (err instanceof MewsApiError) {
      return {
        error: `MEWS rejected those tokens: ${err.message}`,
      };
    }
    return { error: "Couldn't reach MEWS to verify the tokens." };
  }

  try {
    await storeMewsCredentials(hotelId, { clientToken, accessToken });
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  // Connecting changes which setup step is the right one to be on, so the
  // wizard's server components must not be served from the client router cache.
  revalidatePath("/onboarding", "layout");
  return { ok: true, message: "MEWS connected. Your tokens are stored encrypted." };
}

export async function disconnectMews(): Promise<void> {
  const hotelId = await requireHotelId();

  const admin = createAdminClient();
  // Keep pms_type so the UI still shows the right connector; just clear the
  // tokens and mark disconnected.
  const { error } = await admin
    .from("hotels")
    .update({
      mews_client_token_encrypted: null,
      mews_access_token_encrypted: null,
      pms_connected: false,
    })
    .eq("id", hotelId);
  if (error) {
    throw new Error(`Failed to disconnect MEWS: ${error.message}`);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function disconnectGmail(): Promise<void> {
  const hotelId = await requireHotelId();

  const admin = createAdminClient();
  const { error } = await admin
    .from("hotels")
    .update({
      gmail_refresh_token_encrypted: null,
      gmail_email: null,
    })
    .eq("id", hotelId);
  if (error) {
    throw new Error(`Failed to disconnect Gmail: ${error.message}`);
  }

  revalidatePath("/dashboard/settings");
}

export async function disconnectApaleo(): Promise<void> {
  const hotelId = await requireHotelId();

  const admin = createAdminClient();
  const { error } = await admin
    .from("hotels")
    .update({
      apaleo_refresh_token_encrypted: null,
      pms_connected: false,
    })
    .eq("id", hotelId);
  if (error) {
    throw new Error(`Failed to disconnect Apaleo: ${error.message}`);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}
