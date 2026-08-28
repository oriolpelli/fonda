"use client";

import { startTransition, useActionState, useState } from "react";

import {
  updateAccountLanguage,
  type AccountLanguageState,
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
import { Label } from "@/components/ui/label";
import { locales, localeNames } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "flex h-11 w-full rounded-[10px] border border-input bg-popover px-4 py-2.5 text-sm transition-colors",
  "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-[var(--fonda-accent-tint)]",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

/**
 * The account's default language — the discoverable home for the setting.
 *
 * There is no "Saved" message: a successful save redirects into the chosen
 * language, so the page returning in Spanish *is* the confirmation. Only the
 * failure path renders here.
 */
export function AccountLanguageForm({
  defaultLocale,
}: {
  defaultLocale: string;
}) {
  const { dict } = useDictionary();
  const [state, formAction, isPending] = useActionState<
    AccountLanguageState,
    FormData
  >(updateAccountLanguage, undefined);

  const [value, setValue] = useState(defaultLocale);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.accountLanguageTitle}</CardTitle>
        <CardDescription>{dict.settings.accountLanguageDesc}</CardDescription>
      </CardHeader>
      {/*
        Submitted inside a transition rather than via `action={formAction}`:
        React 19 resets a form once its action resolves, restoring every field
        to the server-rendered markup and discarding the selection on the error
        path. Same reason as components/dashboard/brief-delivery-settings-form.
      */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => formAction(formData));
        }}
      >
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="defaultLocale">
              {dict.settings.accountLanguage}
            </Label>
            <select
              id="defaultLocale"
              name="defaultLocale"
              className={selectClassName}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            >
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {localeNames[locale]}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--fonda-text-3)]">
              {dict.settings.accountLanguageHint}
            </p>
          </div>

          {state && "error" in state ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
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
