import "server-only";

import {
  deriveConnectionState,
  type ConnectionState,
} from "@/components/dashboard/connection-status";
import type { PmsType } from "@/lib/pms";
import { createClient } from "@/lib/supabase/server";

/**
 * Is the data still arriving? (APP_UX_PROPOSAL.md §3.3 — "last sync, last
 * failure, quiet by default".)
 *
 * Every other widget on Home is only as true as its last sync, and until now
 * the only place that said so was a dot in the rail's account menu. This is the
 * same reading, written out: one line per connected source.
 *
 * It reports, it doesn't judge. There is no "healthy" state to render — a
 * source that is working prints when it last worked and nothing else, which is
 * why this module returns timestamps and a state rather than a tone or a
 * colour. `deriveConnectionState` is the shared rule for fresh-vs-stale, the
 * same one the rail's dot uses, so the two can never disagree.
 *
 * No prose here, on purpose: the source's name is a dictionary lookup in the
 * widget (`settings.pmsNames`), so this file stays language-free like
 * lib/todo-rules.ts.
 */

/** How many recent runs to read per source. Enough to find the last failure. */
const LOG_WINDOW = 20;

/**
 * The guest-email poll runs every 5 minutes (vercel.json), so an hour of
 * silence is twelve missed runs — stale by any reading. The PMS sync keeps the
 * `deriveConnectionState` default, which is already 4× its 15-minute interval.
 */
const EMAIL_FRESHNESS_MS = 60 * 60 * 1000;

export interface SourceHealth {
  /** Stable React key and dictionary key. */
  key: "pms" | "email";
  /** Which PMS product, for the label. Null on the email row. */
  pms: PmsType | null;
  state: ConnectionState;
  /** Last run that succeeded, ISO-8601 UTC. Null = never. */
  lastSuccessAt: string | null;
  /**
   * The last failure, but only when it is *newer* than the last success: an
   * error the next run recovered from is history, and Home is not a log.
   */
  lastFailureAt: string | null;
}

interface LogRow {
  status: string;
  created_at: string;
  finished_at?: string | null;
}

/** The newest row with this status, if the window holds one. */
function newest(rows: LogRow[], status: string): LogRow | undefined {
  return rows.find((r) => r.status === status);
}

/** A failure worth showing: one that nothing has succeeded after. */
function unresolvedFailure(
  rows: LogRow[],
  lastSuccessAt: string | null
): string | null {
  const failure = newest(rows, "error");
  if (!failure) return null;
  if (lastSuccessAt && lastSuccessAt >= failure.created_at) return null;
  return failure.created_at;
}

function toPmsType(value: string | null | undefined): PmsType {
  return value === "apaleo" || value === "sheet" ? value : "mews";
}

/**
 * One line per *connected* source. A source the hotel hasn't connected has no
 * health to report, so it isn't listed — an empty array is the honest reading
 * for a hotel that has connected nothing, and the widget shows its empty state.
 *
 * RLS scopes both log tables to the caller's hotel.
 */
export async function loadSyncHealth(): Promise<SourceHealth[]> {
  const supabase = await createClient();

  const { data: hotel } = await supabase
    .from("hotels")
    .select("pms_type, pms_connected, last_synced_at, gmail_email")
    .maybeSingle();

  if (!hotel) return [];

  const pmsConnected = hotel.pms_connected ?? false;
  const emailConnected = Boolean(hotel.gmail_email);

  const [syncLogs, emailLogs] = await Promise.all([
    pmsConnected
      ? supabase
          .from("sync_logs")
          .select("status, created_at, finished_at")
          .order("created_at", { ascending: false })
          .limit(LOG_WINDOW)
      : { data: [] as LogRow[] },
    emailConnected
      ? supabase
          .from("cron_logs")
          .select("status, created_at")
          .eq("job", "emails")
          .order("created_at", { ascending: false })
          .limit(LOG_WINDOW)
      : { data: [] as LogRow[] },
  ]);

  const sources: SourceHealth[] = [];

  if (pmsConnected) {
    const rows = (syncLogs.data ?? []) as LogRow[];
    // `hotels.last_synced_at` is the stamp every other widget's freshness line
    // reads, so the two must agree; the log is only the fallback for a hotel
    // whose stamp predates the column.
    const lastSuccessAt =
      hotel.last_synced_at ?? newest(rows, "success")?.finished_at ?? null;
    sources.push({
      key: "pms",
      pms: toPmsType(hotel.pms_type),
      state: deriveConnectionState(true, lastSuccessAt),
      lastSuccessAt,
      lastFailureAt: unresolvedFailure(rows, lastSuccessAt),
    });
  }

  if (emailConnected) {
    const rows = (emailLogs.data ?? []) as LogRow[];
    const lastSuccessAt = newest(rows, "success")?.created_at ?? null;
    sources.push({
      key: "email",
      pms: null,
      state: deriveConnectionState(true, lastSuccessAt, EMAIL_FRESHNESS_MS),
      lastSuccessAt,
      lastFailureAt: unresolvedFailure(rows, lastSuccessAt),
    });
  }

  return sources;
}
