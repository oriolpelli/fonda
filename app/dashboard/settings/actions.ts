"use server";

import { revalidatePath } from "next/cache";

import {
  MewsApiError,
  storeMewsCredentials,
  verifyMewsCredentials,
} from "@/lib/mews";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ConnectState =
  | { ok: true; message: string }
  | { error: string }
  | undefined;

export type BriefingSettingsState =
  | { ok: true }
  | { error: string }
  | undefined;

const BRIEFING_LANGUAGES = ["en", "es"] as const;

export async function updateBriefingSettings(
  _prevState: BriefingSettingsState,
  formData: FormData
): Promise<BriefingSettingsState> {
  const gmName = String(formData.get("gmName") ?? "").trim();
  const briefingTime = String(formData.get("briefingTime") ?? "").trim();
  const briefingLanguage = String(formData.get("briefingLanguage") ?? "").trim();

  if (!/^\d{2}:\d{2}$/.test(briefingTime)) {
    return { error: "Enter a valid briefing time." };
  }
  if (
    !BRIEFING_LANGUAGES.includes(
      briefingLanguage as (typeof BRIEFING_LANGUAGES)[number]
    )
  ) {
    return { error: "Choose a briefing language." };
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
      gm_name: gmName || null,
      briefing_time: briefingTime,
      briefing_language: briefingLanguage,
    })
    .eq("hotel_id", hotelId);
  if (error) {
    return { error: `Couldn't save settings: ${error.message}` };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true };
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
