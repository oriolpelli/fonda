import { redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { FirstSyncStep } from "@/components/onboarding/first-sync-step";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { localizedHref } from "@/lib/i18n/navigation";
import { loadOnboardingState } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";

/**
 * Step 3 — the first sync.
 *
 * Reached only with a PMS connected, because there would otherwise be nothing
 * to pull. The delivery hour comes from the hotel's own settings rather than a
 * hard-coded 7am, so the "your first brief arrives at…" promise on the next
 * screen is one Fondas will actually keep.
 */
export default async function FirstSyncPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const state = await loadOnboardingState();

  if (!state.hasHotel) {
    redirect(localizedHref(locale, "/onboarding"));
  }
  if (!state.pmsConnected) {
    redirect(localizedHref(locale, "/onboarding/connect"));
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("hotel_settings")
    .select("brief_send_hour")
    .maybeSingle();

  const hour = settings?.brief_send_hour ?? 7;
  const briefTime = `${String(hour).padStart(2, "0")}:00`;

  return (
    <OnboardingShell
      step={3}
      title={dict.onboarding.step3Title}
      description={dict.onboarding.step3Desc}
      dict={dict}
    >
      <FirstSyncStep
        briefTime={briefTime}
        previewDoneHref={`${localizedHref(locale, "/onboarding/done")}?brief=ready`}
        nextHref={localizedHref(locale, "/onboarding/done")}
      />
    </OnboardingShell>
  );
}
