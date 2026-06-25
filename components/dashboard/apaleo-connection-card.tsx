"use client";

import { disconnectApaleo } from "@/app/[lang]/dashboard/settings/actions";
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

export function ApaleoConnectionCard({ connected }: { connected: boolean }) {
  const { dict } = useDictionary();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.apaleoTitle}</CardTitle>
        <CardDescription>{dict.settings.apaleoDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {connected
            ? dict.settings.apaleoConnected
            : dict.settings.apaleoNotConnected}
        </p>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button asChild>
          {/* Full-page navigation to an OAuth route handler (not a page), so a
              plain anchor — next/link would prefetch/SPA-navigate incorrectly. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/connect/apaleo">
            {connected
              ? dict.settings.reconnectApaleo
              : dict.settings.connectApaleo}
          </a>
        </Button>
        {connected ? (
          <form action={disconnectApaleo}>
            <Button type="submit" variant="outline">
              {dict.common.disconnect}
            </Button>
          </form>
        ) : null}
      </CardFooter>
    </Card>
  );
}

export type ApaleoStatusKey =
  | "connected"
  | "denied"
  | "invalid_state"
  | "misconfigured"
  | "no_hotel"
  | "error";

/** Maps the `?apaleo=` callback status to a tone + dictionary key. */
export function apaleoStatusMessage(
  status: string | undefined
): { tone: "success" | "error"; key: ApaleoStatusKey } | null {
  switch (status) {
    case "connected":
      return { tone: "success", key: "connected" };
    case "denied":
      return { tone: "error", key: "denied" };
    case "invalid_state":
      return { tone: "error", key: "invalid_state" };
    case "misconfigured":
      return { tone: "error", key: "misconfigured" };
    case "no_hotel":
      return { tone: "error", key: "no_hotel" };
    case "error":
      return { tone: "error", key: "error" };
    default:
      return null;
  }
}
