"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { connectMews, type ConnectState } from "@/app/[lang]/dashboard/settings/actions";
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

function SubmitButton({ connected }: { connected: boolean }) {
  const { pending } = useFormStatus();
  const { dict } = useDictionary();
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? dict.settings.verifying
        : connected
          ? dict.settings.updateTokens
          : dict.settings.connectMews}
    </Button>
  );
}

export function MewsConnectionForm({ connected }: { connected: boolean }) {
  const { dict } = useDictionary();
  const [state, formAction] = useActionState<ConnectState, FormData>(
    connectMews,
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.mewsTitle}</CardTitle>
        <CardDescription>{dict.settings.mewsDesc}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="clientToken">{dict.settings.clientToken}</Label>
            <Input
              id="clientToken"
              name="clientToken"
              type="password"
              autoComplete="off"
              placeholder={
                connected ? dict.settings.tokenStored : dict.settings.clientToken
              }
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="accessToken">{dict.settings.accessToken}</Label>
            <Input
              id="accessToken"
              name="accessToken"
              type="password"
              autoComplete="off"
              placeholder={
                connected ? dict.settings.tokenStored : dict.settings.accessToken
              }
              required
            />
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
          <SubmitButton connected={connected} />
        </CardFooter>
      </form>
    </Card>
  );
}
