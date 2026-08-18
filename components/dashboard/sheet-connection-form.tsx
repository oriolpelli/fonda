"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import {
  connectSheet,
  type ConnectState,
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

function SubmitButton() {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? dict.settings.verifying : dict.settings.connectSheet}
    </Button>
  );
}

/**
 * Connect a Google Sheet (or any published CSV) as the hotel's PMS source, for
 * hotels that keep bookings in a spreadsheet rather than MEWS/Apaleo. Mirrors
 * MewsConnectionForm: verify-then-store on the server, and fire `onConnected`
 * so the wizard advances to the first sync.
 */
export function SheetConnectionForm({
  connected,
  onConnected,
}: {
  connected: boolean;
  onConnected?: () => void;
}) {
  const { dict } = useDictionary();
  const [state, formAction] = useActionState<ConnectState, FormData>(
    connectSheet,
    undefined
  );

  useEffect(() => {
    if (state && "ok" in state) onConnected?.();
  }, [state, onConnected]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.sheetTitle}</CardTitle>
        <CardDescription>{dict.settings.sheetDesc}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sheetUrl">{dict.settings.sheetUrlLabel}</Label>
            <Input
              id="sheetUrl"
              name="sheetUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder={
                connected
                  ? dict.settings.sheetStored
                  : dict.settings.sheetUrlPlaceholder
              }
              required
            />
            <p className="text-xs leading-relaxed text-[var(--fonda-text-3)]">
              {dict.settings.sheetHelp}
            </p>
            <a
              href="/fondas-sheet-template.csv"
              download
              className="text-xs font-medium text-[var(--fonda-accent)] underline-offset-4 hover:underline"
            >
              {dict.settings.sheetTemplate}
            </a>
          </div>
          {state && "error" in state ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
          {state && "ok" in state ? (
            <p className="text-sm font-medium text-[var(--fonda-accent)]">
              {state.message}
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
