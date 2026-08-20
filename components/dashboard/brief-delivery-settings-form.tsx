"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

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

interface BriefDeliverySettingsFormProps {
  recipients: string[];
  sendHour: number;
  language: string;
  timezone: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? dict.common.saving : dict.common.save}
    </Button>
  );
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
  const [state, formAction] = useActionState<BriefDeliveryState, FormData>(
    updateBriefDeliverySettings,
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.briefing.settingsTitle}</CardTitle>
        <CardDescription>{dict.briefing.settingsDesc}</CardDescription>
      </CardHeader>
      <form action={formAction}>
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
                defaultValue={sendHour}
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
                defaultValue={language}
              >
                <option value="en">{dict.settings.languageEn}</option>
                <option value="es">{dict.settings.languageEs}</option>
                <option value="ca">{dict.settings.languageCa}</option>
              </select>
            </div>
          </div>

          {state && "error" in state ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
          {state && "ok" in state ? (
            <p className="text-sm font-medium text-[var(--fonda-text)]">
              {dict.settings.settingsSaved}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
