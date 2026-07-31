"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { ApaleoConnectionCard } from "@/components/dashboard/apaleo-connection-card";
import { MewsConnectionForm } from "@/components/dashboard/mews-connection-form";
import { useDictionary } from "@/components/i18n/dictionary-provider";

/**
 * Step 2 — the same two connectors Settings offers, wired for the wizard.
 *
 * They are the Settings components, not copies: connecting during setup and
 * connecting later must behave identically, including the token verification
 * against MEWS before anything is stored. The only thing added here is what
 * happens *after* success — go straight to the first sync, rather than sitting
 * on a "connected" message with nowhere to go.
 *
 * Apaleo leaves the app for OAuth and comes back through
 * /connect/apaleo/callback; the server page above picks the redirect up from
 * the hotel row, so nothing needs handling here.
 */
export function PmsConnectStep({
  connected,
  nextHref,
  skipHref,
}: {
  connected: boolean;
  nextHref: string;
  skipHref: string;
}) {
  const router = useRouter();
  const { dict } = useDictionary();

  // Stable identity: MewsConnectionForm fires this from an effect keyed on it.
  const onConnected = useCallback(() => {
    router.replace(nextHref);
  }, [router, nextHref]);

  return (
    <>
      <MewsConnectionForm connected={connected} onConnected={onConnected} />
      <ApaleoConnectionCard connected={connected} fromOnboarding />

      <div className="flex flex-col gap-1.5 border-t border-border pt-4">
        <Link
          href={skipHref}
          className="text-sm font-medium text-[var(--fonda-text-2)] underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {dict.onboarding.skipPms}
        </Link>
        <p className="text-xs leading-relaxed text-[var(--fonda-text-3)]">
          {dict.onboarding.skipPmsNote}
        </p>
      </div>
    </>
  );
}
