"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

import { useDictionary } from "@/components/i18n/dictionary-provider";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

type Status =
  | { state: "idle" }
  | { state: "syncing" }
  | { state: "done"; reservations: number; customers: number }
  | { state: "error"; message: string };

export function SyncNowButton({
  endpoint = "/api/sync",
}: {
  endpoint?: string;
}) {
  const router = useRouter();
  const { dict } = useDictionary();
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const isSyncing = status.state === "syncing";

  async function handleSync() {
    setStatus({ state: "syncing" });
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = (await res.json()) as {
        reservations?: number;
        customers?: number;
        error?: string;
      };

      if (!res.ok) {
        setStatus({
          state: "error",
          message: data.error ?? t(dict.admin.syncFailed, { status: res.status }),
        });
        return;
      }

      setStatus({
        state: "done",
        reservations: data.reservations ?? 0,
        customers: data.customers ?? 0,
      });
      // Re-fetch the server-rendered page data (sync logs, latest reservations).
      router.refresh();
    } catch {
      setStatus({ state: "error", message: dict.common.serverUnreachable });
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
        {isSyncing ? dict.admin.syncing : dict.admin.syncNow}
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
          ? t(dict.admin.syncDone, {
              reservations: status.reservations,
              customers: status.customers,
            })
          : status.state === "error"
            ? status.message
            : ""}
      </p>
    </div>
  );
}
