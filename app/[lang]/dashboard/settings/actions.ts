"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";
import { LOCALE_COOKIE } from "@/lib/i18n/get-locale";
import { localizedHref } from "@/lib/i18n/navigation";
import {
  MewsApiError,
  storeMewsCredentials,
  verifyMewsCredentials,
} from "@/lib/mews";
import type { PmsType } from "@/lib/pms";
import { loadSheet, normalizeSheetCsvUrl, storeSheetSource } from "@/lib/sheet";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { RoomType, Upsell } from "@/types";
import type { Json, TablesUpdate } from "@/types/database";

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

export type AccountLanguageState = { error: string } | undefined;

/**
 * Sets the account's default language.
 *
 * On success this redirects instead of returning `{ ok: true }`: the whole
 * point of the setting is which language the product speaks, so the honest
 * confirmation is the page coming back in that language. The locale cookie is
 * rewritten too, because it is what `getLocale` consults first on any later
 * request that arrives without a `/[lang]` prefix (see lib/i18n/get-locale.ts).
 *
 * Note this deliberately does NOT touch `briefing_language`. The account
 * language seeds that column for new hotels only; once a hotel exists, the
 * language its briefs are written in is an independent choice made on the
 * Morning Brief panel.
 */
export async function updateAccountLanguage(
  _prevState: AccountLanguageState,
  formData: FormData
): Promise<AccountLanguageState> {
  const value = String(formData.get("defaultLocale") ?? "").trim();
  if (!isLocale(value)) {
    return { error: "Choose a language." };
  }

  let hotelId: string;
  try {
    hotelId = await requireHotelId();
  } catch (err) {
    return { error: (err as Error).message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("hotel_settings")
    .update({ default_locale: value })
    .eq("hotel_id", hotelId);
  if (error) {
    return { error: `Couldn't save settings: ${error.message}` };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Route paths — the locale is a dynamic `[lang]` segment, so a URL path like
  // "/dashboard/settings" matches no route and revalidates nothing.
  revalidatePath("/[lang]/dashboard", "layout");
  redirect(localizedHref(value, "/dashboard/settings"));
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

/** The credential columns a disconnect clears, per source. */
const PMS_CREDENTIAL_COLUMNS: Record<PmsType, TablesUpdate<"hotels">> = {
  mews: {
    mews_client_token_encrypted: null,
    mews_access_token_encrypted: null,
  },
  apaleo: { apaleo_refresh_token_encrypted: null },
  sheet: { sheet_url_encrypted: null },
};

/**
 * Deletes the reservation/guest cache the hotel synced from the source it is
 * disconnecting.
 *
 * `reservations` and `customers` are keyed by the *source's own* booking ids
 * (`mews_id`), so a different source never overwrites them on its next sync —
 * a sheet's rows would sit alongside the new PMS's forever, and every surface
 * that reads the cache (briefs, occupancy, check-in chasing, chat) would count
 * both. Clearing is therefore the recommended path when switching, and the
 * Settings control ticks the box by default; a hotel reconnecting the *same*
 * source (rotated MEWS tokens, a re-shared sheet) can untick it and keep the
 * cache until the next sync refreshes it.
 *
 * `emails` are deliberately left alone: they come from Gmail, a separate
 * connection, and their `reservation_mews_id` link simply stops resolving —
 * which every reader already treats as "no matched booking" (lib/stay-phase.ts).
 */
async function clearSyncedPmsData(hotelId: string): Promise<void> {
  const admin = createAdminClient();

  const { error: reservationsError } = await admin
    .from("reservations")
    .delete()
    .eq("hotel_id", hotelId);
  if (reservationsError) {
    throw new Error(
      `Failed to clear synced reservations: ${reservationsError.message}`
    );
  }

  const { error: customersError } = await admin
    .from("customers")
    .delete()
    .eq("hotel_id", hotelId);
  if (customersError) {
    throw new Error(`Failed to clear synced guests: ${customersError.message}`);
  }

  // Pending chasers are drafts *about* those reservations, so sending one after
  // a switch would email a guest about a booking the new source has never heard
  // of. Sent and skipped rows stay — they are history, not pending work.
  const { error: chasersError } = await admin
    .from("checkin_chasers")
    .delete()
    .eq("hotel_id", hotelId)
    .eq("status", "pending");
  if (chasersError) {
    throw new Error(
      `Failed to clear pending check-in chasers: ${chasersError.message}`
    );
  }
}

/**
 * Disconnects `source` and leaves the hotel free to connect a different one.
 *
 * All three disconnects reset `pms_type` as well as `pms_connected`: a hotel
 * that disconnects is choosing a source again, and a lingering `pms_type` would
 * both hard-lock Settings to the old connector and keep `getPmsClientForHotel`
 * dispatching at it. With both cleared the scheduled sync skips the hotel (it
 * selects on `pms_connected`) and a manual "Sync now" fails closed rather than
 * reading a source the hotel just disconnected.
 *
 * `formData` comes from the Settings disconnect form; `clearSyncedData` on it
 * asks for the cached rows to go too (see `clearSyncedPmsData`).
 */
async function disconnectPms(
  source: PmsType,
  formData?: FormData
): Promise<void> {
  const hotelId = await requireHotelId();
  const clearData = formData?.get("clearSyncedData") === "on";

  const admin = createAdminClient();
  const { error } = await admin
    .from("hotels")
    .update({
      ...PMS_CREDENTIAL_COLUMNS[source],
      pms_type: null,
      pms_connected: false,
      // Only meaningful alongside the purge: "synced 5 minutes ago" with no
      // rows left is what makes the dashboard claim data it no longer has.
      ...(clearData ? { last_synced_at: null } : {}),
    })
    .eq("id", hotelId);
  if (error) {
    throw new Error(`Failed to disconnect ${source}: ${error.message}`);
  }

  if (clearData) {
    await clearSyncedPmsData(hotelId);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  // Disconnecting puts the setup wizard back on "connect a PMS", the same way
  // connecting moves it forward.
  revalidatePath("/onboarding", "layout");
}

export async function disconnectMews(formData?: FormData): Promise<void> {
  await disconnectPms("mews", formData);
}

export async function disconnectApaleo(formData?: FormData): Promise<void> {
  await disconnectPms("apaleo", formData);
}

export async function disconnectSheet(formData?: FormData): Promise<void> {
  await disconnectPms("sheet", formData);
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

export async function connectSheet(
  _prevState: ConnectState,
  formData: FormData
): Promise<ConnectState> {
  const raw = String(formData.get("sheetUrl") ?? "").trim();
  if (!raw) {
    return { error: "Paste the link to your Google Sheet." };
  }
  const csvUrl = normalizeSheetCsvUrl(raw);
  if (!csvUrl) {
    return { error: "That does not look like a Google Sheets link." };
  }

  let hotelId: string;
  try {
    hotelId = await requireHotelId();
  } catch (err) {
    return { error: (err as Error).message };
  }

  // Verify the sheet is reachable and readable before storing it — the same
  // contract as verifying MEWS tokens against MEWS.
  let parsed;
  try {
    parsed = await loadSheet(csvUrl, hotelId);
  } catch (err) {
    return { error: (err as Error).message };
  }
  if (parsed.reservations.length === 0) {
    return {
      error:
        "We could not read any bookings from that sheet. Check the columns match the template and the sheet is shared.",
    };
  }

  try {
    await storeSheetSource(hotelId, raw);
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding", "layout");
  return {
    ok: true,
    message: `Google Sheet connected — ${parsed.reservations.length} bookings found.`,
  };
}
