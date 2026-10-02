import { timingSafeEqual } from "node:crypto";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Kept in step with migration 0024's header and with /trust. */
const RETENTION_MONTHS = 24;

/**
 * Rate snapshots (migration 0030) are kept 400 days: long enough that a
 * same-night-last-year comparison becomes possible, and no longer. They hold
 * no guest data — counts and money per night — so this is housekeeping, not
 * a privacy promise.
 */
const RATE_SNAPSHOT_DAYS = 400;

/** PostgREST's answers for a table that isn't there (0030 not applied yet). */
const MISSING_TABLE = new Set(["42P01", "PGRST205"]);

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Nightly guest-profile retention sweep (APP_UX_PROPOSAL.md §11 decision 6).
 *
 * Hard-deletes every guest profile whose last completed stay ended more than
 * 24 months ago. Not archived, not soft-deleted — the policy stated on /trust
 * is deletion, and a soft delete would make that line untrue.
 *
 * A NULL `last_stay_end` is never deleted. It means no completed stay yet: a
 * guest with a future booking and no history, which is not stale data. The
 * partial index on this column matches that.
 *
 * WHAT IT LOGS: counts. Never a guest id, a name, or an address — a retention
 * log that named the people it deleted would defeat its own purpose, and
 * cron_logs is not a place guest data belongs.
 *
 * Runs across ALL hotels with the service role, which is correct here and is
 * the one place in the product it is: the sweep is an obligation of the
 * platform rather than an action by a hotel's user, and there is no session to
 * scope it to at 03:00.
 */
export async function GET() {
  const secret = process.env.CRON_SECRET;
  const authHeader = (await headers()).get("authorization") ?? "";
  if (!secret || !safeEqual(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);

  try {
    const { data, error } = await admin
      .from("guest_profiles")
      .delete()
      .lt("last_stay_end", cutoff.toISOString())
      // Counting what went, without reading anything about who they were.
      .select("customer_mews_id");

    if (error) throw new Error(error.message);

    const deleted = (data ?? []).length;

    const snapshotCutoff = new Date(
      Date.now() - RATE_SNAPSHOT_DAYS * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 10);
    const snapshots = await admin
      .from("rate_snapshots")
      .delete({ count: "exact" })
      .lt("as_of", snapshotCutoff);
    if (snapshots.error && !MISSING_TABLE.has(snapshots.error.code)) {
      throw new Error(snapshots.error.message);
    }
    const snapshotsDeleted = snapshots.count ?? 0;

    await admin.from("cron_logs").insert({
      job: "retention",
      status: "ok",
      message: `deleted=${deleted} cutoff=${cutoff.toISOString().slice(0, 10)} rate_snapshots=${snapshotsDeleted}`,
    });

    return NextResponse.json({ deleted, rateSnapshotsDeleted: snapshotsDeleted });
  } catch (err) {
    const message = (err as Error).message;
    Sentry.captureException(new Error(message), {
      tags: { stage: "retention" },
    });
    await admin.from("cron_logs").insert({
      job: "retention",
      status: "error",
      message: message.slice(0, 200),
    });
    return NextResponse.json({ error: "Retention sweep failed" }, { status: 500 });
  }
}
