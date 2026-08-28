import "server-only";

import { PostHog } from "posthog-node";

import type { EmailClassification } from "@/lib/email-processor";

/**
 * Server-side product analytics (B12/B16 — draft-acceptance measurement).
 *
 * Four rules, in priority order. The first two are not style preferences;
 * they are what keeps the privacy policy true.
 *
 * 1. **No guest PII, ever.** Events carry a hotel id and enumerated facts —
 *    never a guest name, an email address, a subject line, or message body.
 *    This is enforced by the type system, not by care: every property below is
 *    a number, a boolean, or a *string-literal union*. There is deliberately
 *    no property typed as bare `string`, so there is nowhere for free text to
 *    be passed in, even by accident. `assertNoFreeText` is a second tripwire
 *    for anyone who widens a type in future.
 *
 * 2. **Server-side only, and cookieless.** We use `posthog-node`, never the
 *    browser SDK. Nothing is written to the visitor's device, no identifier
 *    follows a person between sessions, and no request is made from the
 *    client. That is what keeps "only strictly necessary cookies" in the
 *    privacy policy accurate — do not add `posthog-js` without changing that
 *    statement and taking cookie consent advice first.
 *
 * 3. **The subject is the hotel, not the person.** `distinctId` is the hotel's
 *    uuid. We are measuring a property's use of the product, not an
 *    individual's behaviour, so there is no per-user identity to leak. GeoIP
 *    is disabled — the only IP PostHog would ever see is our server's, and
 *    resolving it adds noise, not signal.
 *
 * 4. **Off unless configured.** With no `POSTHOG_KEY` every call here is a
 *    no-op. Local development and CI therefore send nothing, and a missing
 *    key can never fail a request.
 *
 * Analytics must never break the product: `track()` swallows its own errors
 * and never rejects. A dropped metric is an acceptable loss; a guest email
 * that failed to send because a stats call threw is not.
 */

/** How much the GM changed a draft before sending it. */
export type EditBucket = "none" | "minor" | "major";

/** Which drafting surface a measurement came from. */
export type DraftSurface = "email_reply" | "checkin_chaser";

/**
 * The complete event catalogue. Adding an event means adding it here first.
 *
 * Note the value types: unions of string literals, numbers and booleans only.
 * Lengths (`chars`) and counts are recorded instead of content — "the GM asked
 * a 140-character question" is a useful signal; the question itself is not
 * ours to collect.
 */
type EventProperties = {
  brief_generated: { trigger: "cron" | "manual" };
  brief_email_sent: { recipient_count: number };
  draft_generated: {
    classification: EmailClassification;
    /** False for classifications we deliberately never auto-draft. */
    drafted: boolean;
  };
  draft_sent: { edit_bucket: EditBucket; bulk: boolean };
  /**
   * The PMF measurement. Fires on **every** send, including unedited ones
   * (`edit_bucket: "none"`) — despite the event name, which is the one the
   * spec fixed. The unedited sends are the denominator: an acceptance rate
   * needs to know how often we got it right first time, not only how often
   * we got it wrong.
   */
  draft_edited_before_send: {
    surface: DraftSurface;
    edit_bucket: EditBucket;
    /** 0–100. How much of the draft survived to the sent message. */
    similarity_pct: number;
    /** True when sent via "approve all", where editing isn't possible. */
    bulk: boolean;
  };
  chaser_sent: { edit_bucket: EditBucket; bulk: boolean };
  eta_captured: { source: "email_reply" | "manual" };
  chat_query: {
    /** Length of the question, not the question. */
    chars: number;
    turns: number;
    produced_draft: boolean;
  };
};

export type AnalyticsEvent = keyof EventProperties;

let client: PostHog | null = null;
let initialised = false;

function getClient(): PostHog | null {
  if (initialised) return client;
  initialised = true;

  const key = process.env.POSTHOG_KEY;
  if (!key) return null; // Rule 4: unconfigured means silent, not broken.

  client = new PostHog(key, {
    host: process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com",
    // Serverless functions can be frozen the moment the response is returned,
    // so a batching queue would silently lose whatever it was holding. Send
    // each event as it happens and accept the extra requests.
    flushAt: 1,
    flushInterval: 0,
    disableGeoip: true,
  });
  return client;
}

/**
 * Second line of defence behind the types: refuse to send anything that looks
 * like free text. With the catalogue above this can never fire — which is the
 * point. If it ever does, someone has widened a property to `string` and this
 * is the thing that stops a guest's address reaching a third party.
 */
function assertNoFreeText(
  event: AnalyticsEvent,
  properties: Record<string, unknown>
): boolean {
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value !== "string") continue;
    if (value.includes("@") || value.length > 64) {
      console.error(
        `[analytics] Dropped "${event}": property "${key}" looks like free ` +
          `text or an address. Event properties must be enumerated values ` +
          `— see the catalogue in lib/analytics.ts.`
      );
      return false;
    }
  }
  return true;
}

/**
 * Records one product event against a hotel.
 *
 * Never throws and never rejects — callers can treat it as fire-and-forget.
 */
export function track<E extends AnalyticsEvent>(
  hotelId: string,
  event: E,
  properties: EventProperties[E]
): void {
  const posthog = getClient();
  if (!posthog) return;

  const props = properties as Record<string, unknown>;
  if (!assertNoFreeText(event, props)) return;

  try {
    posthog.capture({
      distinctId: hotelId,
      event,
      properties: { ...props, hotel_id: hotelId },
      disableGeoip: true,
    });
  } catch (err) {
    // Analytics is never allowed to affect the caller's outcome.
    console.error(`[analytics] capture failed for "${event}":`, err);
  }
}

/**
 * Flushes anything still queued. Worth awaiting at the end of a cron run,
 * where the process is about to exit; ordinary request paths don't need it
 * because `flushAt: 1` sends as it goes.
 */
export async function flushAnalytics(): Promise<void> {
  if (!client) return;
  try {
    await client.flush();
  } catch {
    // Best-effort by definition.
  }
}
