import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";

import type { AiFailureCode } from "@/lib/ai-failure";

/**
 * Turns a failed AI call into something safe to show, and makes sure WE hear
 * about it instead of the hotel.
 *
 * The provider's error text never reaches a screen. "Your credit balance is too
 * low…" or "invalid x-api-key" are our problems, and showing them to a GM reads
 * as a company that can't pay its bills. So:
 *
 *   • the person gets a code — "ai_busy" when trying again shortly will work
 *     (rate limits, overload, a 5xx, a dropped connection), "ai_unavailable"
 *     for everything else — and the UI turns it into a calm sentence;
 *   • the real reason goes to the server log and to Sentry, tagged with
 *     `ai_failure` (billing / auth / busy / other) and raised as `fatal` for
 *     billing and auth, which no retry will fix — that is the alert to act on.
 *
 * Returns null when the error didn't come from the model provider at all (a
 * database write, a missing hotel): the caller keeps its own generic message
 * for those, so we don't blame "the AI" for something that wasn't.
 */
export function classifyAiError(
  err: unknown,
  where: string
): AiFailureCode | null {
  const fromProvider =
    err instanceof Anthropic.APIError ||
    err instanceof Anthropic.APIConnectionError;
  if (!fromProvider) return null;

  const status = err instanceof Anthropic.APIError ? err.status : undefined;
  const message = err instanceof Error ? err.message : String(err);

  const billing = /credit balance|billing|payment/i.test(message);
  const auth = status === 401 || status === 403;
  const busy =
    !billing &&
    (err instanceof Anthropic.APIConnectionError ||
      status === 408 ||
      status === 429 ||
      status === 529 ||
      (typeof status === "number" && status >= 500));
  const kind = billing ? "billing" : auth ? "auth" : busy ? "busy" : "other";

  // Provider messages describe the request, not the guest — no message text
  // or prompt content is in them — so they are safe to log as they are.
  console.error(
    `[ai] ${where} failed (${kind}${status ? ` ${status}` : ""}): ${message}`
  );
  Sentry.captureException(err, {
    level: billing || auth ? "fatal" : "error",
    tags: { stage: "ai", ai_where: where, ai_failure: kind },
  });

  return busy ? "ai_busy" : "ai_unavailable";
}
