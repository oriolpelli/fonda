"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateGmName,
  type GmNameState,
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

interface GmNameFormProps {
  gmName: string;
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

export function GmNameForm({ gmName }: GmNameFormProps) {
  const { dict } = useDictionary();
  const [state, formAction] = useActionState<GmNameState, FormData>(
    updateGmName,
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
