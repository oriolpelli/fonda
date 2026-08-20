import Link from "next/link";
import { redirect } from "next/navigation";

import { loadDictionary } from "@/app/[lang]/dictionaries";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Button } from "@/components/ui/button";
import { localizedHref } from "@/lib/i18n/navigation";
import { loadOnboardingState } from "@/lib/onboarding";

/**
 * Step 4 — the end of the wizard.
 *
 * Three different people land here and each needs a different first line: one
 * who generated a brief a moment ago, one who synced but didn't, and one who
 * skipped the PMS entirely and has nothing yet. Only the last is told to come
 * back and finish — the dashboard's banner will keep saying so.
 *
 * Connecting an inbox is named here, once, as optional. It is genuinely the
 * next thing worth doing, but the email assistant is useless without guest mail
 * to work on, so it is a link and not a step.
 */
export default async function OnboardingDonePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ brief?: string }>;
}) {
  const { locale, dict } = await loadDictionary((await params).lang);
  const [state, { brief }] = await Promise.all([
    loadOnboardingState(),
    searchParams,
  ]);

  if (!state.hasHotel) {
    redirect(localizedHref(locale, "/onboarding"));
  }

  const briefReady = brief === "ready";
  const skipped = !state.pmsConnected;

  const description = briefReady
    ? dict.onboarding.step4DescBrief
    : skipped
      ? dict.onboarding.step4DescSkipped
      : dict.onboarding.step4Desc;

  const nextUp = skipped
    ? [dict.onboarding.next1Skipped, dict.onboarding.next2Skipped]
    : [dict.onboarding.next1, dict.onboarding.next2, dict.onboarding.next3];

  return (
    <OnboardingShell
      step={4}
      title={dict.onboarding.step4Title}
      description={description}
      dict={dict}
    >
      <ul className="flex flex-col gap-3.5">
        {nextUp.map((item) => (
          <li key={item} className="flex items-start gap-3">
            {/* Ink, not navy. v2 set list markers in the accent; v3 reserves
                it for data (§3.2), and onboarding is product chrome — the same
                call components/onboarding/onboarding-shell.tsx makes for the
                progress segments. */}
            <span
              className="mt-[7px] block size-[7px] shrink-0 rounded-[2px] bg-[var(--fonda-ink)]"
              aria-hidden
            />
            <span className="text-sm leading-[1.5] text-foreground">{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-col gap-2">
        {briefReady ? (
          <>
            <Button asChild>
              <Link href={localizedHref(locale, "/dashboard/brief")}>
                {dict.onboarding.readFirstBrief}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={localizedHref(locale, "/dashboard")}>
                {dict.onboarding.goToDashboard}
              </Link>
            </Button>
          </>
        ) : skipped ? (
          <>
            <Button asChild>
              <Link href={localizedHref(locale, "/onboarding/connect")}>
                {dict.onboarding.connectPmsNow}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={localizedHref(locale, "/dashboard")}>
                {dict.onboarding.goToDashboard}
              </Link>
            </Button>
          </>
        ) : (
          <Button asChild>
            <Link href={localizedHref(locale, "/dashboard")}>
              {dict.onboarding.goToDashboard}
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground">
          {dict.onboarding.gmailTitle}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {dict.onboarding.gmailDesc}
        </p>
        {/* A full-page navigation to an OAuth route handler, not a page — a
            plain anchor, since next/link would try to prefetch it. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/connect/gmail"
          className="mt-1 self-start text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {dict.onboarding.gmailCta}
        </a>
      </div>
    </OnboardingShell>
  );
}
