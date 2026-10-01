import "server-only";

import { createHash } from "node:crypto";

/**
 * AI provenance — the ONE place model IDs live (AI_ACT_PROMPTS.md A1).
 *
 * Every piece of text a model writes in Fondas has to be able to answer, later,
 * "which model wrote this, from which prompt version, and when" — that is the
 * evidence behind the Art. 50(2) marking (lib/ai-disclosure.ts, A2) and the
 * "How Fondas uses AI" page on /trust (A5). So the model strings are declared
 * here once and imported everywhere they are used: a model can't change in a
 * feature without changing here, and the record written next to each output
 * can't drift from the call that produced it.
 *
 * `grep -rn "claude-" lib app` should find model IDs in this file and nowhere
 * else. If it finds one elsewhere, move it here.
 *
 * KNOBS DIFFER BY MODEL — re-check before swapping one:
 *   • Haiku 4.5 does NOT support `output_config.effort`. Sending it returns a
 *     400 ("This model does not support the effort parameter"). That is what
 *     silently broke every email classification until 28 Jul. Structured
 *     output (`format`) works.
 *   • Sonnet 4.6 supports `effort` (low/medium/high/max) and `format`.
 *   • Opus 4.8 supports `effort`, `format` and adaptive thinking.
 */
export const AI_MODELS = {
  /**
   * Inbound guest-email triage: category, language, booking reference. A
   * cheap structured task, so Haiku. NO `effort` (see above).
   */
  emailClassify: "claude-haiku-4-5-20251001",
  /**
   * Guest-facing reply drafts: Sonnet, a strong balance of quality and cost.
   * Dial up (e.g. an Opus model) if draft acceptance says so.
   */
  emailDraft: "claude-sonnet-4-6",
  /**
   * Check-in chasers are short, formulaic guest messages, so Sonnet is plenty
   * and much cheaper than Opus at this volume. Haiku is the next step down if
   * quality holds — remember to drop `effort` if you make that change.
   */
  chaser: "claude-sonnet-4-6",
  /**
   * Intentionally Opus. The morning brief is the flagship output GMs judge
   * Fondas on, and it runs once per hotel per day, so the quality is worth the
   * cost. Sonnet 4.6 is the trade-down if needed.
   */
  briefing: "claude-opus-4-8",
  /**
   * Ask: chat resends context every turn and is the highest-token surface, so
   * Sonnet. An Opus model if a premium tier ever exists.
   */
  chat: "claude-sonnet-4-6",
  /**
   * Trip purpose / occasion / preferences from a guest's mail and bookings.
   * Same shape as the classifier: Haiku, structured output, NO `effort`.
   */
  guestInference: "claude-haiku-4-5-20251001",
  /** Settings → reviews: two or three sentences from pasted reviews. Haiku. */
  reviewSummary: "claude-haiku-4-5-20251001",
} as const;

export type AiFeature = keyof typeof AI_MODELS;

/**
 * A short, dated version per feature's system prompt.
 *
 * BUMP THE VERSION IN THE SAME COMMIT AS ANY CHANGE TO THAT FEATURE'S SYSTEM
 * PROMPT (or its schema, or its input shape). The version is stored next to
 * every output, so "this draft came from email-draft@2026-10-01" only means
 * something if the string moves when the prompt does. Format:
 * `<feature>@<YYYY-MM-DD>`, with a letter suffix for a second change the same
 * day (`…@2026-10-01b`).
 *
 * The 2026-10-01 versions are the prompts as they stood when provenance began
 * to be recorded; nothing generated before migration 0025 carries a version.
 */
export const PROMPT_VERSIONS: Record<AiFeature, string> = {
  emailClassify: "email-classify@2026-10-01",
  emailDraft: "email-draft@2026-10-01",
  chaser: "chaser@2026-10-01",
  briefing: "briefing@2026-10-01",
  // b: the system prompt split into instructions · cached hotel data · live
  // inbox counts (prompt caching, performance audit §4.8). Same wording.
  chat: "chat@2026-10-01b",
  guestInference: "guest-inference@2026-10-01",
  reviewSummary: "review-summary@2026-10-01",
};

/** Hex SHA-256 of `text`, as UTF-8. Used for `draft_sha256`. */
export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export interface Provenance {
  model: string;
  promptVersion: string;
  /** ISO timestamp, taken when the output came back from the model. */
  generatedAt: string;
}

/**
 * The record to store beside an output, stamped now. Call it right after the
 * model call returns, not before: `generatedAt` describes when the text came
 * into existence.
 *
 * Never put anything here beyond model, version and time. Provenance columns
 * are deliberately incapable of holding guest data (migration 0025).
 */
export function provenance(feature: AiFeature): Provenance {
  return {
    model: AI_MODELS[feature],
    promptVersion: PROMPT_VERSIONS[feature],
    generatedAt: new Date().toISOString(),
  };
}
