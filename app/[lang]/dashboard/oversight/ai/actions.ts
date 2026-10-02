"use server";

import { after } from "next/server";
import { Resend } from "resend";

import { COMPANY } from "@/app/[lang]/(legal)/company";
import {
  AI_FEEDBACK_NOTE_MAX,
  feedbackEmailText,
  isFeedbackItemType,
  isFeedbackReason,
  isUuid,
  type AiFeedbackItemType,
  type AiFeedbackReason,
} from "@/lib/ai-feedback";
import { getHotel, getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

/**
 * The item's own model and prompt version, read through RLS — which is also
 * the check that the item is this hotel's (and, for Ask, this person's own
 * conversation). Null when it isn't visible.
 */
async function lookupItem(
  db: Db,
  type: AiFeedbackItemType,
  id: string
): Promise<{ model: string | null; promptVersion: string | null } | null> {
  switch (type) {
    case "reply": {
      const { data } = await db
        .from("emails")
        .select("draft_model, draft_prompt_version")
        .eq("id", id)
        .maybeSingle();
      return data ? { model: data.draft_model, promptVersion: data.draft_prompt_version } : null;
    }
    case "chaser": {
      const { data } = await db
        .from("checkin_chasers")
        .select("draft_model, draft_prompt_version")
        .eq("id", id)
        .maybeSingle();
      return data ? { model: data.draft_model, promptVersion: data.draft_prompt_version } : null;
    }
    case "brief": {
      const { data } = await db
        .from("briefings")
        .select("model, prompt_version")
        .eq("id", id)
        .maybeSingle();
      return data ? { model: data.model, promptVersion: data.prompt_version } : null;
    }
    case "ask": {
      const { data } = await db.from("chat_threads").select("id").eq("id", id).maybeSingle();
      return data ? { model: null, promptVersion: null } : null;
    }
  }
}

/**
 * Files "Report a problem with an AI output" (AI_ACT_PROMPTS.md A8): writes
 * ai_feedback through RLS (as this person, for their hotel), then — after the
 * response — emails COMPANY.aiContact the ids and codes, never guest data
 * (lib/ai-feedback.ts). The email is best effort; the row is the record.
 */
export async function reportAiProblem(input: {
  itemType: AiFeedbackItemType;
  itemId: string;
  reason: AiFeedbackReason;
  note?: string;
}): Promise<{ ok: boolean }> {
  if (
    !isFeedbackItemType(input.itemType) ||
    !isUuid(input.itemId) ||
    !isFeedbackReason(input.reason)
  ) {
    return { ok: false };
  }
  const note = (input.note ?? "").trim().slice(0, AI_FEEDBACK_NOTE_MAX);

  const [profile, hotel, db] = await Promise.all([
    getSessionProfile(),
    getHotel(),
    createClient(),
  ]);
  if (!profile?.hotelId) return { ok: false };

  const item = await lookupItem(db, input.itemType, input.itemId);
  if (!item) return { ok: false };

  const { data: row, error } = await db
    .from("ai_feedback")
    .insert({
      hotel_id: profile.hotelId,
      user_id: profile.id,
      item_type: input.itemType,
      item_id: input.itemId,
      reason: input.reason,
      note: note || null,
    })
    .select("id, created_at")
    .single();
  if (error || !row) {
    console.error("[ai-feedback] insert failed:", error?.code);
    return { ok: false };
  }

  const email = feedbackEmailText({
    reportId: row.id,
    hotelId: profile.hotelId,
    hotelName: hotel?.name ?? null,
    itemType: input.itemType,
    itemId: input.itemId,
    reason: input.reason,
    noteLength: note.length,
    model: item.model,
    promptVersion: item.promptVersion,
    at: row.created_at,
  });
  after(async () => {
    if (!process.env.RESEND_API_KEY) return;
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM ?? "Fondas <onboarding@resend.dev>",
        to: [COMPANY.aiContact],
        subject: email.subject,
        text: email.text,
      });
      if (sendError) console.error("[ai-feedback] email failed:", sendError.name);
    } catch (err) {
      console.error("[ai-feedback] email failed:", (err as Error).name);
    }
  });

  return { ok: true };
}
