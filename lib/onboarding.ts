import "server-only";

import { localizedHref } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Where a signed-in user is in setup, and where they should be.
 *
 * The wizard has no "current step" column: every step is derived from what the
 * hotel actually has, so the flow resumes correctly after a closed tab, a
 * bookmarked URL, or the "Finish setup" banner weeks later — and can never
 * claim a hotel is set up when it isn't.
 *
 *   no hotel row          → 1. Hotel basics
 *   no PMS connected      → 2. Connect your PMS
 *   connected, no sync    → 3. First sync
 *   everything done       → the dashboard
 *
 * Step 4 ("You're all set") is deliberately outside this ladder: it is the end
 * of the flow for someone who skipped the PMS as well as for someone who
 * finished it, so it only ever requires a hotel.
 */

export const ONBOARDING_TOTAL_STEPS = 4;

export interface OnboardingState {
  /** The hotel exists — step 1 is done. */
  hasHotel: boolean;
  /** A PMS is connected — step 2 is done (or was skipped and later completed). */
  pmsConnected: boolean;
  /** At least one sync has finished — step 3 is done. */
  hasSynced: boolean;
}

export async function loadOnboardingState(): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { hasHotel: false, pmsConnected: false, hasSynced: false };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return { hasHotel: false, pmsConnected: false, hasSynced: false };
  }

  // RLS scopes this to the caller's hotel.
  const { data: hotel } = await supabase
    .from("hotels")
    .select("pms_connected, last_synced_at")
    .eq("id", profile.hotel_id)
    .maybeSingle();

  return {
    hasHotel: true,
    pmsConnected: hotel?.pms_connected ?? false,
    hasSynced: Boolean(hotel?.last_synced_at),
  };
}

/** The step this user should be on, as a localized href. */
export function resumeHref(locale: Locale, state: OnboardingState): string {
  if (!state.hasHotel) return localizedHref(locale, "/onboarding");
  if (!state.pmsConnected) return localizedHref(locale, "/onboarding/connect");
  if (!state.hasSynced) return localizedHref(locale, "/onboarding/sync");
  return localizedHref(locale, "/dashboard");
}
