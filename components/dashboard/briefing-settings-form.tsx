"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateBriefingSettings,
  type BriefingSettingsState,
} from "@/app/[lang]/dashboard/settings/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "flex h-11 w-full rounded-[10px] border border-input bg-popover px-4 py-2.5 text-sm transition-colors",
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-accent",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

interface BriefingSettingsFormProps {
  gmName: string;
  briefingTime: string; // "HH:MM"
  briefingLanguage: string;
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

export function BriefingSettingsForm({
  gmName,
  briefingTime,
  briefingLanguage,
}: BriefingSettingsFormProps) {
  const { dict } = useDictionary();
  const [state, formAction] = useActionState<BriefingSettingsState, FormData>(
    updateBriefingSettings,
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.briefingTitle}</CardTitle>
        <CardDescription>{dict.settings.briefingDesc}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="gmName">{dict.settings.gmName}</Label>
            <Input
              id="gmName"
              name="gmName"
              defaultValue={gmName}
              placeholder={dict.settings.gmNamePlaceholder}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="briefingTime">{dict.settings.briefingTime}</Label>
              <Input
                id="briefingTime"
                name="briefingTime"
                type="time"
                defaultValue={briefingTime}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="briefingLanguage">{dict.settings.language}</Label>
              <select
                id="briefingLanguage"
                name="briefingLanguage"
                className={selectClassName}
                defaultValue={briefingLanguage}
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
            <p className="text-sm font-medium text-[var(--fonda-accent)]">
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
