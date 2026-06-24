"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { connectMews, type ConnectState } from "@/app/dashboard/settings/actions";
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
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? "Verifying…"
        : connected
          ? "Update tokens"
          : "Connect MEWS"}
    </Button>
  );
}

export function MewsConnectionForm({ connected }: { connected: boolean }) {
  const [state, formAction] = useActionState<ConnectState, FormData>(
    connectMews,
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>MEWS Connector API</CardTitle>
        <CardDescription>
          Paste the Client and Access tokens from your MEWS integration. We
          verify them with MEWS, then store them encrypted at rest.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="clientToken">Client token</Label>
            <Input
              id="clientToken"
              name="clientToken"
              type="password"
              autoComplete="off"
              placeholder={connected ? "•••••••• (stored)" : "Client token"}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="accessToken">Access token</Label>
            <Input
              id="accessToken"
              name="accessToken"
              type="password"
              autoComplete="off"
              placeholder={connected ? "•••••••• (stored)" : "Access token"}
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
