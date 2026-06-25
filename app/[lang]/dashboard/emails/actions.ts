"use server";

import { revalidatePath } from "next/cache";

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

async function sendOne(
  admin: Admin,
  gmail: GmailClient,
  email: SendableEmail
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

  await admin
    .from("emails")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", email.id);
}

/** Sends `content` as the reply to an email, then marks it sent. */
export async function sendReply(
  emailId: string,
  content: string
): Promise<{ error?: string }> {
  const hotelId = await requireHotelId();
  const admin = createAdminClient();

  const { data: email } = await admin
    .from("emails")
    .select("id, from_email, subject, external_id")
    .eq("id", emailId)
    .eq("hotel_id", hotelId)
    .single();
  if (!email) return { error: "Email not found." };

  const gmail = await getGmailClientForHotel(hotelId);
  if (!gmail) return { error: "Gmail is not connected." };

  try {
    await sendOne(admin, gmail, { ...email, draft_reply: content });
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath("/dashboard/emails");
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
    .update({ status })
    .eq("id", emailId)
    .eq("hotel_id", hotelId);
  revalidatePath("/dashboard/emails");
}

export async function flagEmail(emailId: string): Promise<void> {
  await setStatus(emailId, "needs_attention");
}

export async function ignoreEmail(emailId: string): Promise<void> {
  await setStatus(emailId, "ignored");
}

/** Sends every pending arrival_info / general_inquiry draft in one go. */
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
      await sendOne(admin, gmail, email);
      sent++;
    } catch {
      // Skip failures; they remain pending for manual handling.
    }
  }

  revalidatePath("/dashboard/emails");
  return { sent };
}
