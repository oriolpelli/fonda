import { redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { loadOnboardingState, resumeHref } from "@/lib/onboarding";

// A short, curated list. Fondas targets Spain and Europe, so the full ~400
// IANA list (via Intl.supportedValuesOf) is overwhelming and unnecessary.
// Note Spain spans two zones: Europe/Madrid (mainland) and Atlantic/Canary.
const TIMEZONES = [
  "Europe/Madrid",
  "Atlantic/Canary",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Zurich",
  "Europe/Athens",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

function getTimezones(): string[] {
  return TIMEZONES;
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
