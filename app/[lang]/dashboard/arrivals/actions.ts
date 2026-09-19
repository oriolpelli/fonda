"use server";

import { revalidatePath } from "next/cache";

import { track } from "@/lib/analytics";
import { runCheckinChaser } from "@/lib/checkin-chaser";
import { recordDraftSend } from "@/lib/draft-acceptance";
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

interface SendableChaser {
  id: string;
  guest_email: string | null;
  draft_content: string | null;
}

async function sendOne(
  admin: Admin,
  gmail: GmailClient,
  hotelName: string,
  chaser: SendableChaser
): Promise<void> {
  if (!chaser.guest_email) throw new Error("This chaser has no guest email.");
  if (!chaser.draft_content?.trim()) throw new Error("The message is empty.");

  await gmail.sendEmail({
    to: chaser.guest_email,
    subject: `Your upcoming stay at ${hotelName}`,
    body: chaser.draft_content,
  });

  await admin
    .from("checkin_chasers")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", chaser.id);
}

/** Generates today's chaser drafts on demand. */
export async function generateChasers(): Promise<{ created: number; error?: string }> {
  let hotelId: string;
  try {
    hotelId = await requireHotelId();
  } catch (err) {
    return { created: 0, error: (err as Error).message };
  }
  try {
    const created = await runCheckinChaser(hotelId);
    revalidatePath("/dashboard/arrivals");
    return { created };
  } catch (err) {
    return { created: 0, error: (err as Error).message };
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
      .select("id, guest_email, draft_content")
      .eq("id", chaserId)
      .eq("hotel_id", hotelId)
      .single(),
    admin.from("hotels").select("name").eq("id", hotelId).single(),
  ]);
  if (!chaser) return { error: "Chaser not found." };

  const gmail = await getGmailClientForHotel(hotelId);
  if (!gmail) return { error: "Gmail is not connected." };

  try {
    await sendOne(admin, gmail, hotel?.name ?? "our hotel", {
      ...chaser,
      draft_content: content,
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

export async function approveAllChasers(): Promise<{ sent: number; error?: string }> {
  const hotelId = await requireHotelId();
  const admin = createAdminClient();

  const gmail = await getGmailClientForHotel(hotelId);
  if (!gmail) return { sent: 0, error: "Gmail is not connected." };

  const [{ data: chasers }, { data: hotel }] = await Promise.all([
    admin
      .from("checkin_chasers")
      .select("id, guest_email, draft_content")
      .eq("hotel_id", hotelId)
      .eq("status", "pending"),
    admin.from("hotels").select("name").eq("id", hotelId).single(),
  ]);

  let sent = 0;
  for (const chaser of chasers ?? []) {
    try {
      await sendOne(admin, gmail, hotel?.name ?? "our hotel", chaser);
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
