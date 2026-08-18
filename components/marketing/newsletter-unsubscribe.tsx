"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  unsubscribeFromNewsletter,
  type UnsubscribeState,
} from "@/app/[lang]/newsletter/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { localizedHref } from "@/lib/i18n/navigation";

function UnsubscribeButton() {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" variant="ink" disabled={pending}>
      {pending
        ? dict.newsletterUnsubscribe.working
        : dict.newsletterUnsubscribe.button}
    </Button>
  );
}

/**
 * A button rather than the link doing the work on GET: corporate mail scanners
 * fetch every URL in a message, and an unsubscribe that fired on GET would be
 * triggered by a machine, quietly opting people out. Scanners don't submit
 * forms, so the opt-out recorded here is a real one.
 */
export function NewsletterUnsubscribe({ token }: { token: string }) {
  const { dict, locale } = useDictionary();
  const [state, formAction] = useActionState<UnsubscribeState, FormData>(
    unsubscribeFromNewsletter,
    { status: "idle" }
  );
  const t = dict.newsletterUnsubscribe;

  const outcome: { heading: string; body: string } | null =
    state.status === "unsubscribed"
      ? { heading: t.doneHeading, body: t.doneBody }
      : state.status === "already"
        ? { heading: t.alreadyHeading, body: t.alreadyBody }
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
            <UnsubscribeButton />
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
