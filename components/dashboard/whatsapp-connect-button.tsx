"use client";

import { useState, useTransition } from "react";

import { recordWhatsAppConnectClick } from "@/app/[lang]/dashboard/communications/actions";
import { Button } from "@/components/ui/button";
import { FIRST_RUN_CTA_ON_GRADIENT } from "@/components/dashboard/first-run-state";
import { cn } from "@/lib/utils";

/**
 * The In-house window's WhatsApp CTA (APP_UX_PROPOSAL.md §5.3).
 *
 * It connects nothing, and it does not pretend to. In-house guests text rather
 * than email, so an In-house inbox fed only by Gmail is honestly half a
 * channel; the useful thing is to name the gap, let a GM press the button that
 * would close it, and count the presses. What it records is demand — the same
 * signal the locked Home tiles collect, in the one place the absence is felt.
 *
 * After the press it says so and stays said. A button that reverted to its
 * original label would invite a second press and inflate the only number this
 * exists to produce.
 */
export function WhatsAppConnectButton({
  label,
  requestedLabel,
}: {
  label: string;
  requestedLabel: string;
}) {
  const [requested, setRequested] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      // Disabled only once it has done its one job. Disabled up front would be
      // a dead control with no explanation, which is the thing FirstRunState
      // exists to avoid.
      disabled={requested || pending}
      aria-live="polite"
      onClick={() => {
        setRequested(true);
        startTransition(() => {
          void recordWhatsAppConnectClick();
        });
      }}
      className={cn("mt-6", FIRST_RUN_CTA_ON_GRADIENT)}
    >
      {requested ? requestedLabel : label}
    </Button>
  );
}
