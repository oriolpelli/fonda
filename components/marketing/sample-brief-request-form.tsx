"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  requestSampleBrief,
  type SubscribeState,
} from "@/app/[lang]/newsletter/actions";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localizedHref } from "@/lib/i18n/navigation";

function RequestButton() {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" variant="ink" size="lg" disabled={pending}>
      {pending ? dict.sampleBrief.requestSending : dict.sampleBrief.requestButton}
    </Button>
  );
}

/**
 * The ask under the sample brief — NOT a gate over it. The brief above renders
 * in full for everyone, with no interaction; this only asks whether the reader
 * wants one of their own. Keep it that way: putting the sample behind this form
 * would trade the one artefact that proves the product for a conversion rate
 * that is worse, not better.
 *
 * Rides the newsletter pipeline (same table, same double opt-in) with the hotel
 * name as one extra required field and a distinct source tag — see
 * `requestSampleBrief` in app/[lang]/newsletter/actions.ts.
 */
export function SampleBriefRequestForm() {
  const { dict, locale } = useDictionary();
  const [state, formAction] = useActionState<SubscribeState, FormData>(
    requestSampleBrief,
    { status: "idle" }
  );

  const message =
    state.status === "sent"
      ? dict.sampleBrief.requestSent
      : state.status === "invalid"
        ? dict.sampleBrief.requestInvalid
        : state.status === "error"
          ? dict.sampleBrief.requestError
          : null;

  return (
    <div className="rounded-[18px] bg-card p-7 shadow-card md:p-10">
      <h2 className="text-[clamp(1.4rem,2.6vw,1.875rem)] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground">
        {dict.sampleBrief.requestHeadline}
      </h2>
      <p className="mt-3 max-w-[46ch] text-[16px] leading-[1.6] text-muted-foreground">
        {dict.sampleBrief.requestLead}
      </p>

      <form action={formAction} className="mt-7 flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />

        {/* Visible labels, not placeholder-as-label: a placeholder disappears
            the moment someone types, which is exactly when a three-field form
            needs to still say which field is which. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sample-hotel">
              {dict.sampleBrief.requestHotelLabel}
            </Label>
            <Input
              id="sample-hotel"
              name="hotel"
              required
              maxLength={120}
              autoComplete="organization"
              placeholder={dict.sampleBrief.requestHotelPlaceholder}
              className="text-[15px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sample-first-name">
              {dict.sampleBrief.requestNameLabel}
            </Label>
            <Input
              id="sample-first-name"
              name="firstName"
              required
              maxLength={120}
              autoComplete="given-name"
              placeholder={dict.sampleBrief.requestNamePlaceholder}
              className="text-[15px]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sample-email">
            {dict.sampleBrief.requestEmailLabel}
          </Label>
          <Input
            id="sample-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            aria-describedby="sample-request-privacy"
            placeholder={dict.sampleBrief.requestEmailPlaceholder}
            className="text-[15px]"
          />
        </div>

        <div className="mt-1 flex">
          <RequestButton />
        </div>
      </form>

      {/* aria-live so the outcome reaches a screen reader: the form submits
          without navigating, so nothing else announces the result. */}
      <p
        aria-live="polite"
        className={
          message ? "mt-4 text-[14px] leading-[1.5] text-foreground" : "sr-only"
        }
      >
        {message}
      </p>

      {/* Required, not decorative: this is the point of collection, so the
          purpose and the privacy policy have to be visible here — not one
          click away. Do not move it behind a tooltip or a toggle. */}
      <p
        id="sample-request-privacy"
        className="mt-4 text-[13px] leading-[1.6] text-muted-foreground"
      >
        {dict.sampleBrief.requestPrivacy}{" "}
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
