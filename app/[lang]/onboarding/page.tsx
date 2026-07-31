import { redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { loadOnboardingState, resumeHref } from "@/lib/onboarding";

const FALLBACK_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function getTimezones(): string[] {
  const intl = Intl as {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  const values = intl.supportedValuesOf?.("timeZone");
  return values && values.length > 0 ? values : FALLBACK_TIMEZONES;
}

/**
 * Step 1 — the hotel itself. This is the only step that creates anything; from
 * here on the wizard is working on a hotel that already exists.
 *
 * Anyone who already has a hotel is sent on to whichever step they left off at.
 * That is what makes the dashboard's "Finish setup" banner work: it points
 * here, and this lands them in the right place.
 */
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);

  const state = await loadOnboardingState();
  if (state.hasHotel) {
    redirect(resumeHref(locale, state));
  }

  return (
    <OnboardingShell
      step={1}
      title={dict.onboarding.step1Title}
      description={dict.onboarding.step1Desc}
      dict={dict}
    >
      <OnboardingForm timezones={getTimezones()} />
    </OnboardingShell>
  );
}
