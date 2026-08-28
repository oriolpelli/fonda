"use client";

import { startTransition, useActionState, useEffect, useState } from "react";

import {
  updateBriefDeliverySettings,
  type BriefDeliveryState,
} from "@/app/[lang]/dashboard/brief/actions";
import { BriefRecipientsEditor } from "@/components/dashboard/brief-recipients-editor";
import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "flex h-11 w-full rounded-[10px] border border-input bg-popover px-4 py-2.5 text-sm transition-colors",
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[var(--fonda-accent-tint)]",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

/** How long the "Saved" confirmation stays on screen. */
const SAVED_NOTICE_MS = 3000;

interface BriefDeliverySettingsFormProps {
  recipients: string[];
  sendHour: number;
  language: string;
  timezone: string;
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function BriefDeliverySettingsForm({
  recipients,
  sendHour,
  language,
  timezone,
}: BriefDeliverySettingsFormProps) {
  const { dict } = useDictionary();
  const [state, formAction, isPending] = useActionState<
    BriefDeliveryState,
    FormData
  >(updateBriefDeliverySettings, undefined);

  // Controlled, not `defaultValue`. React only honours `defaultValue` when the
  // element mounts, so a fresh value arriving on a later render never reaches
  // the DOM — which is half of why this panel used to snap back after saving.
  const [languageValue, setLanguageValue] = useState(language);
  const [sendHourValue, setSendHourValue] = useState(sendHour);

  // Re-seed from what the action reports it persisted, once per submission.
  // The guard compares the result object's *identity*: useActionState hands
  // back a new object per submission, so this fires exactly once per save and
  // never fights the user's typing afterwards. Done during render rather than
  // in an effect so there is no frame showing the stale value.
  const [appliedResult, setAppliedResult] = useState<BriefDeliveryState>(undefined);
  const [showSaved, setShowSaved] = useState(false);
  // Bumped per successful save so a second save restarts the notice timer
  // instead of inheriting the first one's remaining time.
  const [saveNonce, setSaveNonce] = useState(0);

  if (state !== appliedResult) {
    setAppliedResult(state);
    if (state && "ok" in state) {
      setLanguageValue(state.saved.language);
      setSendHourValue(state.saved.sendHour);
      setShowSaved(true);
      setSaveNonce((n) => n + 1);
    }
  }

  useEffect(() => {
    if (!showSaved) return;
    const timer = setTimeout(() => setShowSaved(false), SAVED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [showSaved, saveNonce]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.briefing.settingsTitle}</CardTitle>
        <CardDescription>{dict.briefing.settingsDesc}</CardDescription>
      </CardHeader>
      {/*
        Submitted by hand inside a transition rather than via `action={formAction}`.
        React 19 resets a form automatically once its action resolves, and that
        reset is the last thing to happen — it restores every field to the value
        in the server-rendered markup, overwriting both uncontrolled fields and
        controlled ones whose React state didn't change. That reset is the other
        half of the snap-back, and opting out of it is the only fix that holds.

        This costs the no-JS submit path, which this panel never had: the
        recipients editor is a client component that serialises its rows into a
        hidden input, so the form has always required JavaScript.
      */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => formAction(formData));
        }}
      >
        <CardContent className="flex flex-col gap-5">
          <BriefRecipientsEditor initialRecipients={recipients} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sendHour">
                {dict.briefing.sendHour} ({timezone})
              </Label>
              <select
                id="sendHour"
                name="sendHour"
                className={selectClassName}
                value={sendHourValue}
                onChange={(event) =>
                  setSendHourValue(Number(event.target.value))
                }
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {hourLabel(hour)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="language">{dict.settings.language}</Label>
              <select
                id="language"
                name="language"
                className={selectClassName}
                value={languageValue}
                onChange={(event) => setLanguageValue(event.target.value)}
              >
                <option value="en">{dict.settings.languageEn}</option>
                <option value="es">{dict.settings.languageEs}</option>
                <option value="ca">{dict.settings.languageCa}</option>
              </select>
              {/* Names the boundary between the two language settings, at the
                  one place a GM is likely to confuse them. */}
              <p className="text-xs text-[var(--fonda-text-3)]">
                {dict.briefing.languageAccountHint}
              </p>
            </div>
          </div>

          {state && "error" in state ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
          {showSaved ? (
            <p
              role="status"
              className="text-sm font-medium text-[var(--fonda-text)]"
            >
              {dict.settings.settingsSaved}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? dict.common.saving : dict.common.save}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
