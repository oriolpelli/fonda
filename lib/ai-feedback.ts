/**
 * "Report a problem with an AI output" — the shapes shared by the button, the
 * server action and the AI activity page (AI_ACT_PROMPTS.md A8). Plain module.
 */

export const AI_FEEDBACK_ITEM_TYPES = ["reply", "chaser", "brief", "ask"] as const;
export type AiFeedbackItemType = (typeof AI_FEEDBACK_ITEM_TYPES)[number];

export const AI_FEEDBACK_REASONS = [
  "wrong_fact",
  "wrong_tone",
  "should_not_draft",
  "other",
] as const;
export type AiFeedbackReason = (typeof AI_FEEDBACK_REASONS)[number];

/** The note's limit, as the column enforces (migration 0032). */
export const AI_FEEDBACK_NOTE_MAX = 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isFeedbackItemType(v: unknown): v is AiFeedbackItemType {
  return typeof v === "string" && (AI_FEEDBACK_ITEM_TYPES as readonly string[]).includes(v);
}
export function isFeedbackReason(v: unknown): v is AiFeedbackReason {
  return typeof v === "string" && (AI_FEEDBACK_REASONS as readonly string[]).includes(v);
}
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

/**
 * The email that tells us about a report — built from ids, codes, counts and
 * the model only. NO GUEST DATA BY CONSTRUCTION: the reporter's note is not an
 * input (it can quote a guest), only its length is; nor is anything read from
 * the item's text. The hotel's name is the hotel's, not a guest's.
 */
export function feedbackEmailText(input: {
  reportId: string;
  hotelId: string;
  hotelName: string | null;
  itemType: AiFeedbackItemType;
  itemId: string;
  reason: AiFeedbackReason;
  noteLength: number;
  model: string | null;
  promptVersion: string | null;
  at: string;
}): { subject: string; text: string } {
  return {
    subject: `AI problem report — ${input.reason} (${input.itemType})`,
    text: [
      "A hotel reported a problem with an AI output.",
      "",
      `Report:          ${input.reportId}`,
      `When:            ${input.at}`,
      `Hotel:           ${input.hotelName ?? "(unnamed)"} — ${input.hotelId}`,
      `Item:            ${input.itemType} ${input.itemId}`,
      `What was wrong:  ${input.reason}`,
      `Model:           ${input.model ?? "(not recorded)"}`,
      `Prompt version:  ${input.promptVersion ?? "(not recorded)"}`,
      `Note:            ${input.noteLength > 0 ? `${input.noteLength} characters — in ai_feedback, row ${input.reportId}` : "none"}`,
      "",
      "No guest data is included in this email by design. Read the item and the note in the database.",
    ].join("\n"),
  };
}
