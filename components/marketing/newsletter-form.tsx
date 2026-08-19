"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  subscribeToNewsletter,
  type SubscribeState,
} from "@/app/[lang]/newsletter/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localizedHref } from "@/lib/i18n/navigation";

function SubscribeButton() {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button
      type="submit"
      variant="ink"
      className="h-11 shrink-0"
      disabled={pending}
    >
      {pending ? dict.footer.newsletterSending : dict.footer.newsletterButton}
    </Button>
  );
}

export function NewsletterForm() {
  const { dict, locale } = useDictionary();
  const [state, formAction] = useActionState<SubscribeState, FormData>(
    subscribeToNewsletter,
    { status: "idle" }
  );

  const message =
    state.status === "sent"
      ? dict.footer.newsletterSent
      : state.status === "invalid"
        ? dict.footer.newsletterInvalid
        : state.status === "error"
          ? dict.footer.newsletterError
          : null;

  return (
    <div className="w-full lg:max-w-[440px] lg:justify-self-end">
      <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-foreground">
        {dict.footer.newsletterTitle}
      </h2>
      <p className="mt-2 max-w-[44ch] text-[15px] leading-[1.6] text-muted-foreground">
        {dict.footer.newsletterHint}
      </p>

      <form action={formAction} className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <input type="hidden" name="locale" value={locale} />
        {/* The Input primitive, not a hand-rolled field: this used to restate
            the whole border/background/focus recipe inline, which meant it
            silently drifted when the tokens moved (it was still filling the
            field with --fonda-bg, now the grey page ground, and ringing with
            the deprecated --fonda-accent-light). Only the marketing type size
            is overridden. */}
        <Input
          type="email"
          name="email"
          required
          autoComplete="email"
          aria-label={dict.footer.newsletterTitle}
          aria-describedby="newsletter-privacy"
          placeholder={dict.footer.newsletterPlaceholder}
          className="text-[15px]"
        />
        <SubscribeButton />
      </form>

      {/* aria-live so the outcome reaches a screen reader: the form submits
          without navigating, so nothing else announces the result. */}
      <p
        aria-live="polite"
        className={
          message
            ? "mt-3 text-[14px] leading-[1.5] text-foreground"
            : "sr-only"
        }
      >
        {message}
      </p>

      {/* Required, not decorative: this is the point of collection, so the
          purpose and the privacy policy have to be visible here — not one
          click away. Do not move it behind a tooltip or a toggle. */}
      <p
        id="newsletter-privacy"
        className="mt-3 text-[13px] leading-[1.6] text-muted-foreground"
      >
        {dict.footer.newsletterPrivacy}{" "}
        <Link
          href={localizedHref(locale, "/privacy")}
          className="underline underline-offset-2 hover:text-foreground"
        >
          {dict.footer.privacy}
        </Link>
        .
      </p>
    </div>
  );
}
