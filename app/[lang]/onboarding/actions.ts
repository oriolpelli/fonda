"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { localizedHref } from "@/lib/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error: string } | undefined;

/**
 * The PMS a fresh hotel is provisioned against. Which one they actually run is
 * settled on the next step by connecting it — `storeMewsCredentials` /
 * `storeApaleoCredentials` both write `pms_type` themselves — so this is only
 * the placeholder until then, and MEWS is the one Fondas fully supports today.
 */
const INITIAL_PMS_TYPE = "mews";

export async function provisionHotel(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const hotelName = String(formData.get("hotelName") ?? "").trim();
  const roomsRaw = String(formData.get("roomsCount") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const localeValue = String(formData.get("locale") ?? "");
  const locale = isLocale(localeValue) ? localeValue : defaultLocale;

  if (!hotelName) {
    return { error: "Enter your hotel's name." };
  }
  const roomsCount = Number.parseInt(roomsRaw, 10);
  if (!Number.isInteger(roomsCount) || roomsCount < 1 || roomsCount > 1000) {
    return { error: "Number of rooms must be between 1 and 1000." };
  }
  if (!timezone) {
    return { error: "Pick a timezone." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(localizedHref(locale, "/login"));
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("provision_hotel", {
    p_user_id: user.id,
    p_email: user.email ?? "",
    p_hotel_name: hotelName,
    p_rooms_count: roomsCount,
    p_timezone: timezone,
    p_pms_type: INITIAL_PMS_TYPE,
  });

  if (error) {
    return { error: `Couldn't set up your hotel: ${error.message}` };
  }

  revalidatePath("/", "layout");
  // On to step 2 rather than the dashboard: a hotel with no PMS has nothing to
  // show there yet, and this is the whole point of the wizard — you reach a
  // real brief in one sitting instead of having to find Settings later.
  redirect(localizedHref(locale, "/onboarding/connect"));
}
