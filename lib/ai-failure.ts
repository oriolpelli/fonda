import type { Dictionary } from "@/app/[lang]/dictionaries";

/**
 * What a person is told when an AI call fails — the client-safe half.
 *
 * The server never sends the provider's own error text to the browser
 * (lib/ai-errors.ts classifies it and reports the real reason to us). What
 * crosses the network is one of these codes, and the copy for each lives in
 * the dictionaries, so a GM reads a calm sentence in their own language —
 * never "Your credit balance is too low to access the Anthropic API".
 */
export const AI_FAILURE_CODES = ["ai_busy", "ai_unavailable"] as const;
export type AiFailureCode = (typeof AI_FAILURE_CODES)[number];

export function isAiFailureCode(value: unknown): value is AiFailureCode {
  return (
    typeof value === "string" &&
    (AI_FAILURE_CODES as readonly string[]).includes(value)
  );
}

/** The sentence for a code, or null when `value` isn't one of ours. */
export function aiFailureText(
  dict: Dictionary,
  value: unknown
): string | null {
  if (!isAiFailureCode(value)) return null;
  return value === "ai_busy" ? dict.common.aiBusy : dict.common.aiUnavailable;
}
