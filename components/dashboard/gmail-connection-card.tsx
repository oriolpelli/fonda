"use client";

import { disconnectGmail } from "@/app/[lang]/dashboard/settings/actions";
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
import { t } from "@/lib/i18n/format";

export function GmailConnectionCard({ email }: { email: string | null }) {
  const { dict } = useDictionary();
  const connected = Boolean(email);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.settings.gmailTitle}</CardTitle>
        <CardDescription>{dict.settings.gmailDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {connected
            ? t(dict.settings.gmailConnectedAs, { email: email ?? "" })
            : dict.settings.gmailNotConnected}
        </p>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button asChild>
          {/* Full-page navigation to an OAuth route handler (not a page), so a
              plain anchor — next/link would prefetch/SPA-navigate incorrectly. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/connect/gmail">
            {connected ? dict.settings.reconnectGmail : dict.settings.connectGmail}
          </a>
        </Button>
        {connected ? (
          <form action={disconnectGmail}>
            <Button type="submit" variant="outline">
              {dict.common.disconnect}
            </Button>
          </form>
        ) : null}
      </CardFooter>
    </Card>
  );
}

export type GmailStatusKey =
  | "denied"
  | "invalid_state"
  | "misconfigured"
  | "no_hotel"
  | "error";

/** Maps the `?gmail=` callback status to a dictionary key (success handled separately). */
export function gmailStatusMessage(
  status: string | undefined
): { tone: "error"; key: GmailStatusKey } | null {
  switch (status) {
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
