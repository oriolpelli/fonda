"use server";

import { revalidatePath } from "next/cache";

import { track, type EditBucket } from "@/lib/analytics";
import { recordDraftSend } from "@/lib/draft-acceptance";
import { measureDraftEdit } from "@/lib/draft-edit";
import { getGmailClientForHotel, type GmailClient } from "@/lib/gmail";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;

/** Triage actions for the guest inbox at /dashboard/communications. */

function revalidateInbox(): void {
  // Route (not URL) paths — the locale is a dynamic `[lang]` segment.
  //
  // All three Communications routes, since W6 split the inbox into two windows
  // (APP_UX_PROPOSAL.md §5.3): the parent is a redirect and has nothing of its
  // own to refresh, but a triage action moves a message's *status*, and both
  // windows render status. Revalidating only the one the action was fired from
  // would leave the other stale until a hard reload — and the two are one click
  // apart in the sidebar.
  revalidatePath("/[lang]/dashboard/communications/in-house", "page");
  revalidatePath("/[lang]/dashboard/communications/upcoming", "page");
  // The sidebar badge is rendered by the dashboard layout, above the page.
  revalidatePath("/[lang]/dashboard", "layout");
}

/**
 * Records that someone asked for WhatsApp from the In-house window.
 *
 * The button is inert on purpose and says so. In-house guests text rather than
 * email, so an In-house inbox fed only by Gmail is half a channel; the honest
 * move is to show the gap, let a GM press the thing that would close it, and
 * count the presses. A dialog collecting an address to do nothing with would
 * be worse.
 *
 * Same contract as `recordLockedWidgetClick`: the hotel is the subject, never
 * the person (lib/analytics.ts rule 3), and it returns nothing and throws
 * nothing — a dropped metric is the acceptable loss, since the click was
 * already inert.
 */
export async function recordWhatsAppConnectClick(): Promise<void> {
  try {
    const hotelId = await requireHotelId();
    track(hotelId, "whatsapp_connect_clicked", {});
  } catch {
    // Analytics is never allowed to affect the caller's outcome.
  }
}

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

function replySubject(subject: string | null): string {
  const s = (subject ?? "").trim();
  return /^re:/i.test(s) ? s : `Re: ${s || "your message"}`;
}

interface SendableEmail {
  id: string;
  from_email: string | null;
  subject: string | null;
  external_id: string | null;
  draft_reply: string | null;
}

/**
 * How a reply went out — recorded on the row (migration 0025) as the human
 * oversight half of the AI Act evidence: was there a draft, did a person change
 * it, and was it sent one at a time or in a batch.
 */
interface SendRecord {
  /** "single" from the editor; "bulk" from "approve all". */
  via: "single" | "bulk";
  /**
   * The edit bucket of what is being sent against the stored draft, or null
   * when there was no draft to edit (a reply written from scratch).
   */
  edit: EditBucket | null;
}

/** The draft's edit bucket, or null when Fondas wrote nothing to edit. */
function editOf(drafted: string | null, sent: string): EditBucket | null {
  return drafted?.trim() ? measureDraftEdit(drafted, sent).bucket : null;
}

async function sendOne(
  admin: Admin,
  gmail: GmailClient,
  email: SendableEmail,
  record: SendRecord
): Promise<void> {
  if (!email.from_email) throw new Error("This email has no sender address.");
  if (!email.draft_reply?.trim()) throw new Error("The reply is empty.");

  // Look up the original thread so the reply is threaded in Gmail.
  let threadId: string | undefined;
  if (email.external_id) {
    try {
      threadId = (await gmail.getMessage(email.external_id)).threadId;
    } catch {
      // Threading is best-effort; send a standalone reply if lookup fails.
    }
  }

  await gmail.sendEmail({
    to: email.from_email,
    subject: replySubject(email.subject),
    body: email.draft_reply,
    threadId,
  });

  const now = new Date().toISOString();
  await admin
    .from("emails")
    .update({
      status: "sent",
      sent_at: now,
      updated_at: now,
      sent_via: record.via,
      draft_edited: record.edit === null ? null : record.edit !== "none",
    })
    .eq("id", email.id);
}

/** Sends `content` as the reply to an email, then marks it sent. */
export async function sendReply(
  emailId: string,
  content: string
): Promise<{ error?: string }> {
  const hotelId = await requireHotelId();
  const admin = createAdminClient();

  // `draft_reply` is what Fondas wrote; `content` is what the GM is sending.
  // The two are only comparable here, before the row is overwritten — this is
  // the single moment the acceptance metric can be measured.
  const { data: email } = await admin
    .from("emails")
    .select("id, from_email, subject, external_id, draft_reply")
    .eq("id", emailId)
    .eq("hotel_id", hotelId)
    .single();
  if (!email) return { error: "Email not found." };

  const gmail = await getGmailClientForHotel(hotelId);
  if (!gmail) return { error: "Gmail is not connected." };

  // Measured BEFORE the send, so the row records whether a person changed the
  // draft (and, from A2, so the outbound marking can say so). The measurement
  // is pure; the acceptance metric below is still recorded after the send,
  // exactly as before.
  const edit = editOf(email.draft_reply, content);

  try {
    await sendOne(
      admin,
      gmail,
      { ...email, draft_reply: content },
      { via: "single", edit }
    );
  } catch (err) {
    return { error: (err as Error).message };
  }

  // After the send succeeded: we measure replies that reached a guest, not
  // ones we attempted.
  const bucket = await recordDraftSend({
    hotelId,
    surface: "email_reply",
    drafted: email.draft_reply,
    sent: content,
  });
  track(hotelId, "draft_sent", { edit_bucket: bucket, bulk: false });

  revalidateInbox();
  return {};
}

async function setStatus(
  emailId: string,
  status: "needs_attention" | "ignored"
): Promise<void> {
  const hotelId = await requireHotelId();
  const admin = createAdminClient();
  await admin
    .from("emails")
    // updated_at is the only record of WHEN a message was flagged or ignored
    // (ROADMAP §3.2, decision P-7) — sent_at covers only sends.
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", emailId)
    .eq("hotel_id", hotelId);
  revalidateInbox();
}

export async function flagEmail(emailId: string): Promise<void> {
  await setStatus(emailId, "needs_attention");
}

export async function ignoreEmail(emailId: string): Promise<void> {
  await setStatus(emailId, "ignored");
}

/**
 * Sends every pending arrival_info / general_inquiry draft in one go.
 *
 * The narrow filter is the safety rail: bulk approval only ever touches the two
 * routine categories, and only where a draft already exists. Complaints,
 * cancellations, modifications and special requests are never sent this way —
 * those always get read by a human first.
 */
export async function approveAllStandard(): Promise<{
  sent: number;
  error?: string;
}> {
  const hotelId = await requireHotelId();
  const admin = createAdminClient();

  const gmail = await getGmailClientForHotel(hotelId);
  if (!gmail) return { sent: 0, error: "Gmail is not connected." };

  const { data: emails } = await admin
    .from("emails")
    .select("id, from_email, subject, external_id, draft_reply")
    .eq("hotel_id", hotelId)
    .eq("status", "pending")
    .in("classification", ["arrival_info", "general_inquiry"])
    .not("draft_reply", "is", null);

  let sent = 0;
  for (const email of emails ?? []) {
    try {
      // Verbatim — there is no editor in this path — so the bucket is "none".
      await sendOne(admin, gmail, email, { via: "bulk", edit: "none" });
      sent++;
      // Bulk approval sends the draft verbatim — there is no editor in this
      // path — so the bucket is always "none". Flagged `bulk` so the rollup
      // can separate "the GM read this and approved it" from "the GM approved
      // a batch"; counting them the same would flatter the acceptance rate.
      const bucket = await recordDraftSend({
        hotelId,
        surface: "email_reply",
        drafted: email.draft_reply,
        sent: email.draft_reply,
        bulk: true,
      });
      track(hotelId, "draft_sent", { edit_bucket: bucket, bulk: true });
    } catch {
      // Skip failures; they remain pending for manual handling.
    }
  }

  revalidateInbox();
  return { sent };
}
