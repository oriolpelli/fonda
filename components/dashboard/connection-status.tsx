import { cn } from "@/lib/utils";

export type ConnectionState = "green" | "amber" | "red";

const CONFIG: Record<ConnectionState, { dot: string; label: string }> = {
  green: { dot: "bg-emerald-500", label: "Synced" },
  amber: { dot: "bg-amber-500", label: "Stale" },
  red: { dot: "bg-red-500", label: "Not connected" },
};

/**
 * Derives the connection state from PMS connection + sync freshness.
 * Green: connected and synced within the freshness window. Amber: connected but
 * never synced or stale. Red: PMS not connected.
 */
export function deriveConnectionState(
  pmsConnected: boolean,
  lastSyncedAt: string | null,
  freshnessMs = 60 * 60 * 1000 // 1h — 4× the 15-min cron interval
): ConnectionState {
  if (!pmsConnected) return "red";
  if (!lastSyncedAt) return "amber";
  const age = Date.now() - new Date(lastSyncedAt).getTime();
  return age <= freshnessMs ? "green" : "amber";
}

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const { dot, label } = CONFIG[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      title={`PMS connection: ${label}`}
    >
      <span className={cn("size-2 rounded-full", dot)} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
