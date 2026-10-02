import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Whether a migration that is applied by hand has reached this database yet.
 *
 * Code and schema ship separately here: a branch merges and deploys, and the
 * SQL file is pasted into the Supabase editor when Oriol gets to it. Code that
 * uses a new column must therefore work on both sides of that gap. It asks
 * here, and keeps the old behaviour until the answer is yes.
 *
 * One probe per migration, not per column: a migration's columns arrive
 * together. "Present" is cached for the life of the server instance. "Absent"
 * is re-checked every 10 minutes, so a migration applied mid-day is picked up
 * without a deploy. A probe that fails for any other reason (the network) is
 * answered "absent" and not cached.
 */

const RECHECK_ABSENT_MS = 10 * 60 * 1000;

const PROBES = {
  /** 0029 — content_hash, gmail_thread_id, inference_failed_at. */
  "0029": { table: "reservations", column: "content_hash" },
  /** 0030 — the rate cache: rate_nights and rate_snapshots (B17). */
  "0030": { table: "rate_nights", column: "night" },
} as const;

type Migration = keyof typeof PROBES;

const known = new Map<Migration, { present: boolean; at: number }>();
const inFlight = new Map<Migration, Promise<boolean>>();

/**
 * The answers that mean "not there yet": Postgres's undefined_column and
 * undefined_table, as PostgREST passes them through, and PostgREST's own
 * "not in the schema cache" for a column (PGRST204) or a table (PGRST205).
 * A migration that adds a table (0030) is probed by a column of that table,
 * so the table's absence has to read as absence too, not as a network error.
 */
const ABSENT = new Set(["42703", "42P01", "PGRST204", "PGRST205"]);

export function migrationApplied(migration: Migration): Promise<boolean> {
  const cached = known.get(migration);
  if (cached?.present) return Promise.resolve(true);
  if (cached && Date.now() - cached.at < RECHECK_ABSENT_MS) {
    return Promise.resolve(false);
  }
  const running = inFlight.get(migration);
  if (running) return running;

  const { table, column } = PROBES[migration];
  const probe = (async () => {
    const { error } = await createAdminClient()
      .from(table)
      .select(column)
      .limit(0);
    if (!error) {
      known.set(migration, { present: true, at: Date.now() });
      return true;
    }
    if (ABSENT.has(error.code)) {
      known.set(migration, { present: false, at: Date.now() });
    }
    return false;
  })().finally(() => inFlight.delete(migration));
  inFlight.set(migration, probe);
  return probe;
}
