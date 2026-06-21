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
