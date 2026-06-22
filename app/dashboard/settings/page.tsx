import type { Metadata } from "next";
import { CheckCircle2, Circle } from "lucide-react";

import { disconnectMews } from "@/app/dashboard/settings/actions";
import {
  ApaleoConnectionCard,
  apaleoStatusMessage,
} from "@/components/dashboard/apaleo-connection-card";
import { BriefingSettingsForm } from "@/components/dashboard/briefing-settings-form";
import {
  GmailConnectionCard,
  gmailStatusMessage,
} from "@/components/dashboard/gmail-connection-card";
import { MewsConnectionForm } from "@/components/dashboard/mews-connection-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ apaleo?: string; gmail?: string; ingested?: string }>;
}) {
  const supabase = await createClient();
  const { apaleo, gmail, ingested } = await searchParams;

  // Select explicit columns — the encrypted token columns are revoked from the
  // client role (migration 0002), so `select('*')` would error here.
  const { data: hotel } = await supabase
    .from("hotels")
    .select("id, name, pms_type, pms_connected, gmail_email")
    .single();

  const { data: settings } = await supabase
    .from("hotel_settings")
    .select("gm_name, briefing_time, briefing_language")
    .maybeSingle();

  const connected = hotel?.pms_connected ?? false;
  // Default unconfigured hotels to the MEWS form.
  const pmsType = hotel?.pms_type ?? "mews";
  const apaleoBanner = apaleoStatusMessage(apaleo);
  const gmailBanner = gmailStatusMessage(gmail);
  const gmailConnected = gmail === "connected";

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Connect {hotel?.name ?? "your hotel"}&apos;s property management
          system so Fonda can sync reservations and guests.
        </p>
      </div>

      {apaleoBanner ? (
        <div
          role="status"
          className={cn(
            "rounded-lg border px-4 py-3 text-sm font-medium",
            apaleoBanner.tone === "success"
              ? "border-primary/30 bg-accent text-accent-foreground"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          )}
        >
          {apaleoBanner.text}
        </div>
      ) : null}

      {gmailConnected ? (
        <div
          role="status"
          className="rounded-lg border border-primary/30 bg-accent px-4 py-3 text-sm font-medium text-accent-foreground"
        >
          Connected to {hotel?.gmail_email ?? "your inbox"}. We found{" "}
          {ingested ?? "0"} emails from the last 7 days — drafts will be prepared
          for your review.
        </div>
      ) : gmailBanner ? (
        <div
          role="status"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
        >
          {gmailBanner.text}
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
          connected
            ? "border-primary/30 bg-accent text-accent-foreground"
            : "border-border bg-muted text-muted-foreground"
        )}
      >
        {connected ? (
          <CheckCircle2 className="size-4 text-primary" />
        ) : (
          <Circle className="size-4" />
        )}
        <span className="font-medium">
          {connected
            ? `Connected to ${pmsType.toUpperCase()}`
            : "Not connected"}
        </span>
      </div>

      {pmsType === "apaleo" ? (
        <ApaleoConnectionCard connected={connected} />
      ) : (
        <>
          <MewsConnectionForm connected={connected} />
          {connected ? (
            <form action={disconnectMews}>
              <Button type="submit" variant="outline">
                Disconnect MEWS
              </Button>
            </form>
          ) : null}
        </>
      )}

      <GmailConnectionCard email={hotel?.gmail_email ?? null} />

      <BriefingSettingsForm
        gmName={settings?.gm_name ?? ""}
        briefingTime={(settings?.briefing_time ?? "07:00:00").slice(0, 5)}
        briefingLanguage={settings?.briefing_language ?? "en"}
      />
    </div>
  );
}
