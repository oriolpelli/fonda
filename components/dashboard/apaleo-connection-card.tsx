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

export function ApaleoConnectionCard({
  connected,
  fromOnboarding = false,
}: {
  connected: boolean;
  /**
   * Tells the OAuth round-trip to come back to the setup wizard instead of
   * Settings, so connecting mid-onboarding doesn't drop you out of it.
   */
  fromOnboarding?: boolean;
}) {
  const { dict } = useDictionary();
  const authorizeHref = fromOnboarding
    ? "/connect/apaleo?from=onboarding"
    : "/connect/apaleo";
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
      <CardFooter className="flex flex-wrap gap-3">
        <Button asChild>
          {/* Full-page navigation to an OAuth route handler (not a page), so a
              plain anchor — next/link would prefetch/SPA-navigate incorrectly. */}
          <a href={authorizeHref}>
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

// apaleoStatusMessage / ApaleoStatusKey moved to lib/apaleo-status.ts so the
// server settings page can call them (a client module's exports can't be
// invoked from the server).
