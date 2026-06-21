import type { Metadata } from "next";
import { CheckCircle2, Circle } from "lucide-react";

import { disconnectMews } from "@/app/dashboard/settings/actions";
import { MewsConnectionForm } from "@/components/dashboard/mews-connection-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();

  // Select explicit columns — the encrypted token columns are revoked from the
  // client role (migration 0002), so `select('*')` would error here.
  const { data: hotel } = await supabase
    .from("hotels")
    .select("id, name, pms_type, pms_connected")
    .single();

  const connected = hotel?.pms_connected ?? false;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Connect {hotel?.name ?? "your hotel"}&apos;s property management
          system so Fonda can sync reservations and guests.
        </p>
      </div>

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
            ? `Connected to ${hotel?.pms_type?.toUpperCase() ?? "PMS"}`
            : "Not connected"}
        </span>
      </div>

      <MewsConnectionForm connected={connected} />

      {connected ? (
        <form action={disconnectMews}>
          <Button type="submit" variant="outline">
            Disconnect MEWS
          </Button>
        </form>
      ) : null}
    </div>
  );
}
