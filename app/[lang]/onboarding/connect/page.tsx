import { redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { PmsConnectStep } from "@/components/onboarding/pms-connect-step";
import { apaleoStatusMessage } from "@/lib/apaleo-status";
import { localizedHref } from "@/lib/i18n/navigation";
import { loadOnboardingState } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/**
 * Step 2 — connect the PMS.
 *
 * Connecting is what turns Fondas from an empty shell into something that knows
 * the hotel, so this is the step that matters. Once the hotel row says
 * connected — by either connector, including Apaleo's OAuth round-trip — this
 * page has nothing left to ask and hands over to the first sync.
 */
export default async function ConnectPmsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ apaleo?: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const [state, { apaleo }] = await Promise.all([
    loadOnboardingState(),
    searchParams,
  ]);

  if (!state.hasHotel) {
    redirect(localizedHref(locale, "/onboarding"));
  }
  if (state.pmsConnected) {
    redirect(localizedHref(locale, "/onboarding/sync"));
  }

  // Apaleo reports failures through the callback's `?apaleo=` status; success
  // never reaches this branch because the redirect above catches it first.
  const banner = apaleoStatusMessage(apaleo);

  return (
    <OnboardingShell
      step={2}
      title={dict.onboarding.step2Title}
      description={dict.onboarding.step2Desc}
      dict={dict}
      framed={false}
    >
      {banner ? (
        <div
          role="status"
          className={cn(
            "rounded-lg border px-4 py-3 text-sm font-medium",
            banner.tone === "success"
              ? "border-primary/30 bg-accent text-accent-foreground"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          )}
        >
          {dict.apaleoStatus[banner.key]}
        </div>
      ) : null}

      <PmsConnectStep
        connected={false}
        nextHref={localizedHref(locale, "/onboarding/sync")}
        skipHref={localizedHref(locale, "/onboarding/done")}
      />
    </OnboardingShell>
  );
}
