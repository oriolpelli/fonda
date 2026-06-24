import { cn } from "@/lib/utils";

export type ConnectionState = "green" | "amber" | "red";

// One signal only: navy marks a live/healthy connection, muted marks stale,
// destructive marks a broken connection. No off-palette traffic-light hues.
const CONFIG: Record<ConnectionState, { dot: string; label: string }> = {
  green: { dot: "bg-[var(--fonda-accent)]", label: "Synced" },
  amber: { dot: "bg-[var(--fonda-text-3)]", label: "Stale" },
  red: { dot: "bg-destructive", label: "Not connected" },
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
