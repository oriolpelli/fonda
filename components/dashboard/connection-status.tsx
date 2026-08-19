import { cn } from "@/lib/utils";

export type ConnectionState = "green" | "amber" | "red";

// Chrome is colorless in v3 (FONDA_SANA_REDESIGN.md §3.2), and this dot now
// lives in the rail's account menu — so the tell is DARKNESS, not hue, exactly
// like the active nav state: solid near-black is live, muted is stale.
// Destructive keeps its red, because a broken connection is a real error state.
// No off-palette traffic-light hues, and no navy: that accent is content-only.
const DOTS: Record<ConnectionState, string> = {
  green: "bg-[var(--fonda-text)]",
  amber: "bg-[var(--fonda-text-3)]",
  red: "bg-destructive",
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

export function ConnectionStatus({
  state,
  labels,
}: {
  state: ConnectionState;
  labels: Record<ConnectionState, string>;
}) {
  const dot = DOTS[state];
  const label = labels[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      title={`PMS: ${label}`}
    >
      <span className={cn("size-2 rounded-full", dot)} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
