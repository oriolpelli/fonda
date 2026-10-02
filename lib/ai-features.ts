import "server-only";

import { AI_MODELS, type AiFeature } from "@/lib/ai-provenance";

/**
 * Every place Fondas uses AI, as data (AI_ACT_PROMPTS.md A5).
 *
 * "How Fondas uses AI" on /trust renders one card per entry, and the AI
 * literacy cards (A6) and the classification memo (§L) are written from the
 * same list. It holds KEYS AND THE MODEL ONLY: every word a reader sees —
 * what a feature reads, writes, who checks it, where it can be wrong — lives
 * in the dictionaries under `trustPage.aiFeatures.<key>`, in three languages.
 *
 * The model is read from AI_MODELS, never typed here, so the page cannot
 * drift from the code: change a model in lib/ai-provenance.ts and its card
 * changes with it.
 *
 * COMPLETE BY CONSTRUCTION. `AI_FEATURE_ORDER` must name every key of
 * AI_MODELS — a feature added there without a card here fails to compile
 * (`_everyFeatureHasACard`). Anything new that sends model-written text out of
 * Fondas gets a card from day one (AI_ACT_PROMPTS.md §R).
 */

/** Card order: what reaches a guest first, then what stays inside. */
export const AI_FEATURE_ORDER = [
  "emailDraft",
  "chaser",
  "briefing",
  "chat",
  "guestInference",
  "emailClassify",
  "reviewSummary",
] as const satisfies readonly AiFeature[];

type Uncarded = Exclude<AiFeature, (typeof AI_FEATURE_ORDER)[number]>;
const _everyFeatureHasACard: [Uncarded] extends [never] ? true : never = true;
void _everyFeatureHasACard;

export interface AiFeatureCard {
  key: (typeof AI_FEATURE_ORDER)[number];
  /** The model id, exactly as the code calls it. */
  model: string;
  /** The same, readable: "Claude Sonnet 4.6". */
  modelName: string;
}

/**
 * "claude-sonnet-4-6" → "Claude Sonnet 4.6"; "claude-haiku-4-5-20251001" →
 * "Claude Haiku 4.5". An id that doesn't follow the pattern is shown as is.
 */
export function modelName(id: string): string {
  // A minor version is one or two digits; eight digits are a date snapshot
  // ("claude-sonnet-4-20250514" is Sonnet 4, not 4.20250514).
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/.exec(id);
  if (!m) return id;
  const family = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  return `Claude ${family} ${m[2]}${m[3] ? `.${m[3]}` : ""}`;
}

export function aiFeatureCards(): AiFeatureCard[] {
  return AI_FEATURE_ORDER.map((key) => ({
    key,
    model: AI_MODELS[key],
    modelName: modelName(AI_MODELS[key]),
  }));
}
