"use server";

import { revalidatePath } from "next/cache";

import { aiHeaders } from "@/lib/ai-disclosure";
import { sha256 } from "@/lib/ai-provenance";
import { track, type EditBucket } from "@/lib/analytics";
import { confirmedIds } from "@/lib/bulk-ids";
import { runCheckinChaser } from "@/lib/checkin-chaser";
import { recordDraftSend } from "@/lib/draft-acceptance";
import { measureDraftEdit } from "@/lib/draft-edit";
import { getGmailClientForHotel, type GmailClient } from "@/lib/gmail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;

async function requireHotelId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: profile, error } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();
  if (error || !profile) throw new Error("No hotel associated with this user.");
  return profile.hotel_id;
}

/** The row as stored: `draft_content` is what Fondas wrote, never what is sent. */
interface SendableChaser {
  id: string;
  guest_email: string | null;
  draft_content: string | null;
  draft_model: string | null;
  draft_prompt_version: string | null;
  draft_sha256: string | null;
}

const SENDABLE_COLUMNS =
  "id, guest_email, draft_content, draft_model, draft_prompt_version, draft_sha256";

/**
 * How a chaser went out — recorded on the row (migration 0025). Same contract
 * as the communications action: `edit` is null only when there was no draft.
 */
interface SendRecord {
  via: "single" | "bulk";
  edit: EditBucket | null;
}

/**
 * The Art. 50(2) marking for this chaser, from the provenance stored with the
 * draft (A1). Pre-0025 drafts are still marked, as "unknown" model/prompt with
 * the ref hashed from the stored draft — same contract as communications.
 */
function markingFor(
  chaser: SendableChaser,
  record: SendRecord
): Record<string, string> {
  if (record.edit === null || !chaser.draft_content?.trim()) {
    return aiHeaders({ origin: "written" });
  }
  return aiHeaders({
    origin: "drafted",
    model: chaser.draft_model ?? "unknown",
    promptVersion: chaser.draft_prompt_version ?? "unknown",
    edit: record.edit,
    review: record.via,
    draftSha256: chaser.draft_sha256 ?? sha256(chaser.draft_content),
  });
}

/** Sends `content` for `chaser` (the stored row) and marks it sent. */
async function sendOne(
  admin: Admin,
  gmail: GmailClient,
  hotelName: string,
  chaser: SendableChaser,
  content: string,
  record: SendRecord
): Promise<void> {
  if (!chaser.guest_email) throw new Error("This chaser has no guest email.");
  if (!content.trim()) throw new Error("The message is empty.");

  await gmail.sendEmail({
    to: chaser.guest_email,
    subject: `Your upcoming stay at ${hotelName}`,
    body: content,
    headers: markingFor(chaser, record),
  });

  await admin
    .from("checkin_chasers")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_via: record.via,
      draft_edited: record.edit === null ? null : record.edit !== "none",
    })
    .eq("id", chaser.id);
}

/**
 * Why a code and not a sentence: this action runs on the server, where there is
 * no locale — `[lang]` is the caller's, not ours — so any string built here is
 * English by construction and an es/ca session would read it in the wrong
 * language. `runCheckinChaser` also throws model and Gmail errors whose
 * messages are vendor text, which has no business on screen in guest-facing
 * software. The client owns the wording (`dict.arrivals.chaserErrors`); the
 * real reason goes to the server console, where support can find it. Same split
 * as the brief's delivery settings (app/[lang]/dashboard/brief/actions.ts).
 */
export type GenerateChasersError = "noHotel" | "generateFailed";

/** Generates today's chaser drafts on demand. */
export async function generateChasers(): Promise<{
  created: number;
  error?: GenerateChasersError;
}> {
  let hotelId: string;
  try {
    hotelId = await requireHotelId();
  } catch (err) {
    // "Not authenticated" and "no hotel" are the same dead end for the user and
    // neither is actionable on this page, so they collapse to one message.
    console.error("[arrivals] generate chasers: no hotel for session:", err);
    return { created: 0, error: "noHotel" };
  }
  try {
    const created = await runCheckinChaser(hotelId);
    revalidatePath("/dashboard/arrivals");
    return { created };
  } catch (err) {
    console.error("[arrivals] generate chasers failed:", err);
    return { created: 0, error: "generateFailed" };
  }
}

export async function sendChaser(
  chaserId: string,
  content: string
): Promise<{ error?: string }> {
  const hotelId = await requireHotelId();
  const admin = createAdminClient();

  // `draft_content` is what Fondas wrote, `content` what the GM is sending —
  // comparable only here, before the row is marked sent.
  const [{ data: chaser }, { data: hotel }] = await Promise.all([
    admin
      .from("checkin_chasers")
      .select(SENDABLE_COLUMNS)
      .eq("id", chaserId)
      .eq("hotel_id", hotelId)
      .single(),
    admin.from("hotels").select("name").eq("id", hotelId).single(),
  ]);
  if (!chaser) return { error: "Chaser not found." };

  const gmail = await getGmailClientForHotel(hotelId);
  if (!gmail) return { error: "Gmail is not connected." };

  // Measured before the send so the row and the outbound marking record
  // whether a person changed the draft. Pure; the metric below is
  // still recorded after the send, unchanged.
  const edit = chaser.draft_content?.trim()
    ? measureDraftEdit(chaser.draft_content, content).bucket
    : null;

  try {
    await sendOne(admin, gmail, hotel?.name ?? "our hotel", chaser, content, {
      via: "single",
      edit,
    });
  } catch (err) {
    return { error: (err as Error).message };
  }

  const bucket = await recordDraftSend({
    hotelId,
    surface: "checkin_chaser",
    drafted: chaser.draft_content,
    sent: content,
  });
  track(hotelId, "chaser_sent", { edit_bucket: bucket, bulk: false });

  revalidatePath("/dashboard/arrivals");
  return {};
}

export async function skipChaser(chaserId: string): Promise<void> {
  const hotelId = await requireHotelId();
  const admin = createAdminClient();
  await admin
    .from("checkin_chasers")
    .update({ status: "skipped" })
    .eq("id", chaserId)
    .eq("hotel_id", hotelId);
  revalidatePath("/dashboard/arrivals");
}

/**
 * Sends the pending chasers a person just confirmed in the bulk-send dialog
 * (AI_ACT_PROMPTS.md A4) — exactly those, and only those.
 *
 * `ids` is the list the dialog showed and only ever NARROWS the query: the
 * hotel scope and the pending-only filter are re-applied here, so a chaser
 * generated after the dialog opened is not sent and a forged id is ignored.
 * Widening what bulk approval may send needs a decision in
 * APP_UX_PROPOSAL.md §11 first. Rows sent are recorded as sent_via = 'bulk'.
 */
export async function approveAllChasers(
  ids: string[]
): Promise<{ sent: number; error?: string }> {
  const hotelId = await requireHotelId();
  const admin = createAdminClient();

  const confirmed = confirmedIds(ids);
  if (confirmed.length === 0) return { sent: 0 };

  const gmail = await getGmailClientForHotel(hotelId);
  if (!gmail) return { sent: 0, error: "Gmail is not connected." };

  const [{ data: chasers }, { data: hotel }] = await Promise.all([
    admin
      .from("checkin_chasers")
      .select(SENDABLE_COLUMNS)
      .eq("hotel_id", hotelId)
      .eq("status", "pending")
      .in("id", confirmed),
    admin.from("hotels").select("name").eq("id", hotelId).single(),
  ]);

  let sent = 0;
  for (const chaser of chasers ?? []) {
    try {
      await sendOne(
        admin,
        gmail,
        hotel?.name ?? "our hotel",
        chaser,
        chaser.draft_content ?? "",
        { via: "bulk", edit: "none" }
      );
      sent++;
      // Sent verbatim — no editor in the bulk path. See the same note in the
      // communications action for why these are flagged rather than merged.
      const bucket = await recordDraftSend({
        hotelId,
        surface: "checkin_chaser",
        drafted: chaser.draft_content,
        sent: chaser.draft_content,
        bulk: true,
      });
      track(hotelId, "chaser_sent", { edit_bucket: bucket, bulk: true });
    } catch {
      // Leave failures pending for manual handling.
    }
  }

  revalidatePath("/dashboard/arrivals");
  return { sent };
}
