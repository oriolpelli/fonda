import "server-only";

import { track, type DraftSurface, type EditBucket } from "@/lib/analytics";
import { measureDraftEdit } from "@/lib/draft-edit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Draft acceptance — the PMF metric.
 *
 * "Of the replies Fondas drafted and a GM sent, how many went out as written
 * or close to it?" A hotel that sends our drafts unchanged is a hotel that
 * would miss us; one that rewrites every draft is one paying for a rough first
 * pass. The rate is what tells the two apart, per hotel, over time.
 *
 * Every send is recorded twice, deliberately:
 *   • to `draft_edit_events`, the durable copy the rollup reads. This is the
 *     number we steer by, so it must not live only in a vendor's funnel.
 *   • to PostHog, for exploration alongside the other product events.
 *
 * Neither carries message text or guest identifiers — see `measureDraftEdit`
 * and the comment at the top of the 0019 migration.
 */

export interface RecordSendOptions {
  hotelId: string;
  surface: DraftSurface;
  /** What Fondas generated. Null when the GM wrote from scratch. */
  drafted: string | null | undefined;
  /** What actually went to the guest. */
  sent: string | null | undefined;
  /** True for "approve all" sends, where editing isn't offered. */
  bulk?: boolean;
}

/**
 * Measures one send and records it. Returns the bucket so the caller can emit
 * its own surface-specific event (`draft_sent` / `chaser_sent`) with it.
 *
 * Never throws: a failure to measure must not fail the send that was measured.
 */
export async function recordDraftSend({
  hotelId,
  surface,
  drafted,
  sent,
  bulk = false,
}: RecordSendOptions): Promise<EditBucket> {
  const { bucket, similarityPct } = measureDraftEdit(drafted, sent);

  track(hotelId, "draft_edited_before_send", {
    surface,
    edit_bucket: bucket,
    similarity_pct: similarityPct,
    bulk,
  });

  try {
    const admin = createAdminClient();
    await admin.from("draft_edit_events").insert({
      hotel_id: hotelId,
      surface,
      edit_bucket: bucket,
      similarity_pct: similarityPct,
      bulk,
    });
  } catch (err) {
    console.error("[draft-acceptance] failed to record send:", err);
  }

  return bucket;
}

export interface DraftAcceptanceSummary {
  total: number;
  accepted: number;
  noneCount: number;
  minorCount: number;
  majorCount: number;
  /** Sends made through "approve all", where the GM couldn't edit. */
  bulkCount: number;
  /** Sends the GM opened and could have changed. */
  consideredTotal: number;
  consideredAccepted: number;
  /** 0–1 across every send, or null when there is nothing to measure. */
  acceptanceRate: number | null;
  /**
   * 0–1 across non-bulk sends only — the number to judge draft quality by.
   * A bulk send has no editor, so it always counts as unedited and would
   * flatter `acceptanceRate`. Null when no considered sends exist yet.
   */
  consideredAcceptanceRate: number | null;
}

export interface DraftAcceptancePoint {
  day: string;
  dayTotal: number;
  dayAccepted: number;
  windowTotal: number;
  windowAccepted: number;
  /** Trailing-window rate, 0–1, or null while the window is empty. */
  acceptanceRate: number | null;
}

/**
 * `hotelId` must already be authorised by the caller — every server action
 * here resolves it from the session via `requireHotelId()` and passes it in.
 * The underlying SQL functions are SECURITY INVOKER, so an authenticated
 * client calling the RPC directly is still confined to its own hotel by RLS;
 * the admin client used here bypasses RLS by design, which is what lets an
 * internal tool read across hotels.
 */
export async function getDraftAcceptance(
  hotelId: string,
  from: Date,
  to: Date
): Promise<DraftAcceptanceSummary> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("draft_acceptance_summary", {
      p_hotel_id: hotelId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    })
    .single();

  if (error) {
    throw new Error(`Failed to read draft acceptance: ${error.message}`);
  }

  return {
    total: Number(data.total),
    accepted: Number(data.accepted),
    noneCount: Number(data.none_count),
    minorCount: Number(data.minor_count),
    majorCount: Number(data.major_count),
    bulkCount: Number(data.bulk_count),
    consideredTotal: Number(data.considered_total),
    consideredAccepted: Number(data.considered_accepted),
    acceptanceRate:
      data.acceptance_rate === null ? null : Number(data.acceptance_rate),
    consideredAcceptanceRate:
      data.considered_acceptance_rate === null
        ? null
        : Number(data.considered_acceptance_rate),
  };
}

/** Per-day acceptance with a trailing window, for plotting the trend. */
export async function getDraftAcceptanceRolling(
  hotelId: string,
  from: Date,
  to: Date,
  windowDays = 7
): Promise<DraftAcceptancePoint[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("draft_acceptance_rolling", {
    p_hotel_id: hotelId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_window_days: windowDays,
  });

  if (error) {
    throw new Error(`Failed to read draft acceptance trend: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    day: row.day,
    dayTotal: Number(row.day_total),
    dayAccepted: Number(row.day_accepted),
    windowTotal: Number(row.window_total),
    windowAccepted: Number(row.window_accepted),
    acceptanceRate:
      row.acceptance_rate === null ? null : Number(row.acceptance_rate),
  }));
}
