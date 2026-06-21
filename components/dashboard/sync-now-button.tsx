"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status =
  | { state: "idle" }
  | { state: "syncing" }
  | { state: "done"; reservations: number; customers: number }
  | { state: "error"; message: string };

export function SyncNowButton() {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const isSyncing = status.state === "syncing";

  async function handleSync() {
    setStatus({ state: "syncing" });
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = (await res.json()) as {
        reservations?: number;
        customers?: number;
        error?: string;
      };

      if (!res.ok) {
        setStatus({
          state: "error",
          message: data.error ?? `Sync failed (${res.status}).`,
        });
        return;
      }

      setStatus({
        state: "done",
        reservations: data.reservations ?? 0,
        customers: data.customers ?? 0,
      });
    } catch {
      setStatus({ state: "error", message: "Couldn't reach the server." });
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleSync} disabled={isSyncing} variant="outline">
        {isSyncing ? (
          <Loader2 className="animate-spin" />
        ) : (
          <RefreshCw />
        )}
        {isSyncing ? "Syncing…" : "Sync now"}
      </Button>
      <p
        aria-live="polite"
        className={cn(
          "h-4 text-xs",
          status.state === "error"
            ? "text-destructive"
            : "text-muted-foreground"
        )}
      >
        {status.state === "done"
          ? `Synced ${status.reservations} reservations, ${status.customers} guests.`
          : status.state === "error"
            ? status.message
            : ""}
      </p>
    </div>
  );
}
