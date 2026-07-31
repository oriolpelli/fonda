"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  confirmSubscription,
  type ConfirmState,
} from "@/app/[lang]/newsletter/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { localizedHref } from "@/lib/i18n/navigation";

function ConfirmButton() {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" variant="ink" disabled={pending}>
      {pending
        ? dict.newsletterConfirm.working
        : dict.newsletterConfirm.button}
    </Button>
  );
}

/**
 * Why this is a button and not just the emailed link doing the work:
 * corporate mail scanners (Outlook ATP and friends) fetch every URL in an
 * inbound message to check it is safe. A confirmation that happens on GET is
 * therefore routinely triggered by a machine, which subscribes people who
 * never clicked — and a subscription nobody consented to is exactly what
 * double opt-in exists to prevent. Scanners don't submit forms, so the
 * consent recorded here is a real one.
 */
export function NewsletterConfirm({ token }: { token: string }) {
  const { dict, locale } = useDictionary();
  const [state, formAction] = useActionState<ConfirmState, FormData>(
    confirmSubscription,
    { status: "idle" }
  );
  const t = dict.newsletterConfirm;

  const outcome: { heading: string; body: string } | null =
    state.status === "confirmed"
      ? { heading: t.doneHeading, body: t.doneBody }
      : state.status === "already"
        ? { heading: t.alreadyHeading, body: t.alreadyBody }
        : state.status === "expired"
          ? { heading: t.expiredHeading, body: t.expiredBody }
          : state.status === "invalid"
            ? { heading: t.invalidHeading, body: t.invalidBody }
            : state.status === "error"
              ? { heading: t.errorHeading, body: t.errorBody }
              : null;

  return (
    <div className="rounded-[16px] border border-border bg-card p-8">
      {outcome ? (
        <>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
            {outcome.heading}
          </h1>
          <p className="mt-3 text-[15px] leading-[1.6] text-muted-foreground">
            {outcome.body}
          </p>
        </>
      ) : (
        <>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
            {t.heading}
          </h1>
          <p className="mt-3 text-[15px] leading-[1.6] text-muted-foreground">
            {t.body}
          </p>
          <form action={formAction} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <ConfirmButton />
          </form>
        </>
      )}

      <p className="mt-8 border-t border-border pt-5 text-[14px]">
        <Link
          href={localizedHref(locale, "/")}
          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {t.backHome}
        </Link>
      </p>
    </div>
  );
}
