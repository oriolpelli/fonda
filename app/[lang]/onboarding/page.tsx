import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { Wordmark } from "@/components/brand/wordmark";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { localizedHref } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Welcome" };

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

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { locale } = await loadDictionary((await params).lang);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(localizedHref(locale, "/login"));
  }

  // Already onboarded → straight to the dashboard.
  const { data: profile } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) {
    redirect(localizedHref(locale, "/dashboard"));
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-muted px-4 py-12">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Wordmark href={localizedHref(locale, "/onboarding")} />
      <OnboardingForm timezones={getTimezones()} />
    </div>
  );
}
