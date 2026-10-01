import "server-only";

import type { EditBucket } from "@/lib/analytics";

/**
 * Machine-readable AI marking on everything Fondas sends (AI_ACT_PROMPTS.md A2).
 *
 * WHY. Art. 50(2) of the EU AI Act: providers of AI systems that generate text
 * must ensure the outputs are "marked in a machine-readable format and
 * detectable as artificially generated". Fondas was on the market before
 * 2 Aug 2026, so the Digital Omnibus (Reg. (EU) 2026/1744) gives us until
 * **2 December 2026**. We mark even drafts a person reviewed: the "a human
 * reviewed it" exception is in Art. 50(4) and covers text on matters of public
 * interest, not guest correspondence (reasoning in AI_ACT_PROMPTS.md §0).
 *
 * HOW. Two email headers. The guest never sees them and nothing visible in the
 * email changes — no "written by AI" line is added to guest mail.
 *
 *   X-AI-Generated: true
 *   X-Fondas-AI: origin=drafted; edit=minor; review=single; model=<id>;
 *                prompt=<version>; ref=<first 16 hex of the draft's SHA-256>
 *
 * NO PII, BY CONSTRUCTION. Every value comes from lib/ai-provenance.ts or the
 * provenance columns of migration 0025: a model id, a prompt version, an edit
 * bucket, a review mode and a hash prefix. Nothing about the guest — no name,
 * address or booking reference — is an input to these functions, so none can
 * end up in a header. `ref` is a prefix of a one-way hash; with
 * `npm run verify-ai-mark` it lets us answer "did Fondas write this?" for a DPO
 * without anyone reading the message.
 *
 * THE NAMES ARE OURS. There is no standard header for AI-generated text yet.
 * Revisit if the Code of Practice on marking AI-generated content or the
 * Commission's Art. 50 guidelines name one — add it alongside, don't replace
 * these, so mail already sent stays checkable.
 */

export const AI_GENERATED_HEADER = "X-AI-Generated";
export const FONDAS_AI_HEADER = "X-Fondas-AI";

/** A person wrote it from scratch, with no Fondas draft: nothing to mark. */
interface WrittenReply {
  origin: "written";
}

/** It started as a Fondas draft — whatever a person then did to it. */
interface DraftedReply {
  origin: "drafted";
  model: string;
  promptVersion: string;
  /** How much a person changed the draft before sending (lib/draft-edit.ts). */
  edit: EditBucket;
  /** "single" = read and sent one at a time; "bulk" = "approve all". */
  review: "single" | "bulk";
  /** Hex SHA-256 of the draft as Fondas stored it (draft_sha256). */
  draftSha256: string;
}

export type AiHeaderInput = WrittenReply | DraftedReply;

/**
 * Header values must be one line of printable ASCII. A CR or LF in a value is
 * how header injection works, so it is a thrown error, never a silent strip:
 * a send that can't be marked correctly should fail loudly, not go out
 * unmarked or with an extra header someone smuggled in.
 *
 * `;` and `=` are refused too: they are X-Fondas-AI's own separators, and a
 * value carrying them could append a field of its own ("model=x; review=single").
 * Every legitimate value (model ids, dated prompt versions, buckets, hex) is
 * free of both.
 */
function safe(value: string, what: string): string {
  if (/[\r\n]/.test(value)) {
    throw new Error(`AI marking: ${what} contains a line break.`);
  }
  if (!/^[\x20-\x7E]*$/.test(value)) {
    throw new Error(`AI marking: ${what} is not printable ASCII.`);
  }
  if (/[;=]/.test(value)) {
    throw new Error(`AI marking: ${what} contains a field separator.`);
  }
  return value;
}

function mark(fields: [string, string][]): Record<string, string> {
  const value = fields.map(([k, v]) => `${k}=${safe(v, k)}`).join("; ");
  return {
    [AI_GENERATED_HEADER]: "true",
    [FONDAS_AI_HEADER]: value,
  };
}

/**
 * The headers for an outbound guest email (a reply or a check-in chaser).
 *
 * Returns {} only when there was no Fondas draft at all — the person wrote the
 * reply from scratch, so the text isn't AI output and marking it would be a
 * false statement. A draft a person then rewrote heavily is still marked, as
 * `edit=major`: it started as AI output, and over-marking a reviewed reply
 * costs nothing visible while under-marking is the Art. 50(2) failure. Whether
 * a near-total rewrite should count as "written" is a question for the
 * classification memo (AI_ACT_PROMPTS.md §L), not for this function.
 */
export function aiHeaders(input: AiHeaderInput): Record<string, string> {
  if (input.origin === "written") return {};
  if (!/^[0-9a-f]{16,64}$/.test(input.draftSha256)) {
    throw new Error("AI marking: draftSha256 is not a hex SHA-256.");
  }
  return mark([
    ["origin", "drafted"],
    ["edit", input.edit],
    ["review", input.review],
    ["model", input.model],
    ["prompt", input.promptVersion],
    ["ref", input.draftSha256.slice(0, 16)],
  ]);
}

/**
 * The headers for the morning brief email. It goes to the hotel's own staff,
 * not to guests, and nobody reviews it before it is sent — so `review=none`,
 * which is allowed for the brief only.
 */
export function briefAiHeaders(input: {
  model: string;
  promptVersion: string;
}): Record<string, string> {
  return mark([
    ["origin", "drafted"],
    ["edit", "none"],
    ["review", "none"],
    ["model", input.model],
    ["prompt", input.promptVersion],
  ]);
}
