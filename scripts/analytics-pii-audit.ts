/**
 * Analytics PII audit — proves the privacy policy's claim about analytics.
 *
 *   npm run analytics-pii-audit
 *
 * The privacy policy tells hotels (and their guests) that our product
 * analytics hold no guest personal data. This script is what makes that a
 * checked fact rather than an intention: it intercepts the PostHog client,
 * fires every event in the catalogue with real-looking guest data in scope,
 * and fails if a name, an address or any message text reaches the wire. It
 * also fires one deliberately malformed event to confirm the free-text guard
 * still drops it.
 *
 * Run it after touching lib/analytics.ts, and before changing what the
 * privacy policy says about analytics. Exits non-zero on any leak, so it can
 * be wired into CI.
 *
 * Sends nothing: POSTHOG_KEY is overridden with a dummy and every capture is
 * intercepted in-process.
 */
process.env.POSTHOG_KEY = "phc_audit_dummy_key";

import { PostHog } from "posthog-node";

import { track } from "../lib/analytics";
import { measureDraftEdit } from "../lib/draft-edit";

const captured: { event: string; properties: Record<string, unknown> }[] = [];

// `capture` lives on a parent prototype, not PostHog.prototype — find the
// object that actually owns it and patch there.
function interceptCapture(): void {
  const probe = new PostHog("phc_probe", { flushAt: 1, flushInterval: 0 });
  let proto: object | null = Object.getPrototypeOf(probe);
  while (proto && !Object.getOwnPropertyDescriptor(proto, "capture")) {
    proto = Object.getPrototypeOf(proto);
  }
  if (!proto) throw new Error("Could not locate PostHog#capture to intercept.");
  Object.defineProperty(proto, "capture", {
    value: function (msg: {
      event: string;
      distinctId: string;
      properties?: Record<string, unknown>;
    }) {
      captured.push({
        event: msg.event,
        properties: { distinctId: msg.distinctId, ...(msg.properties ?? {}) },
      });
    },
    writable: true,
    configurable: true,
  });
}

const HOTEL = "9f1c1b4a-0000-4000-8000-000000000001";
const GUEST_NAME = "Margarethe Villanueva-Prat";
const GUEST_EMAIL = "margarethe.villanueva@example.com";
const DRAFT = `Dear ${GUEST_NAME}, thank you for writing about your arrival on the 14th. We can hold the room until 21:00. Kind regards, the front desk.`;

interceptCapture();

console.log("=== measureDraftEdit sanity ===");
const cases: [string, string | null, string][] = [
  ["identical", DRAFT, DRAFT],
  ["reflowed whitespace", DRAFT, DRAFT.replace(/ /g, "\n  ")],
  ["typo fix", DRAFT, DRAFT.replace("thank you", "thanks")],
  ["clause added", DRAFT, DRAFT.replace("21:00.", "21:00, just call if later.")],
  ["full rewrite", DRAFT, `Hi ${GUEST_NAME} — room's held till nine. See you!`],
  ["no draft at all", null, DRAFT],
];
for (const [label, drafted, sent] of cases) {
  const r = measureDraftEdit(drafted, sent);
  console.log(`  ${label.padEnd(22)} -> ${r.bucket.padEnd(6)} ${r.similarityPct}%`);
}

console.log("\n=== every catalogued event, guest data deliberately in scope ===");
const m = measureDraftEdit(DRAFT, DRAFT.replace("thank you", "thanks"));
track(HOTEL, "brief_generated", { trigger: "cron" });
track(HOTEL, "brief_email_sent", { recipient_count: 3 });
track(HOTEL, "draft_generated", { classification: "arrival_info", drafted: true });
track(HOTEL, "draft_sent", { edit_bucket: m.bucket, bulk: false });
track(HOTEL, "draft_edited_before_send", {
  surface: "email_reply", edit_bucket: m.bucket, similarity_pct: m.similarityPct, bulk: false,
});
track(HOTEL, "chaser_sent", { edit_bucket: "none", bulk: true });
track(HOTEL, "eta_captured", { source: "email_reply" });
track(HOTEL, "chat_query", {
  chars: `Which room is ${GUEST_NAME} in?`.length, turns: 4, produced_draft: true,
});

const goodCount = captured.length;

// Tripwire: pretend a future change widened a property to free text.
track(HOTEL, "chat_query", {
  chars: 12, turns: 1, produced_draft: false,
  // @ts-expect-error deliberately violating the catalogue
  guest_email: GUEST_EMAIL,
});

const FORBIDDEN: [string, string][] = [
  ["guest full name", GUEST_NAME],
  ["guest surname", "Villanueva"],
  ["guest email", GUEST_EMAIL],
  ["draft body", "hold the room"],
];

let failures = 0;
for (const { event, properties } of captured) {
  console.log(`  ${event.padEnd(26)} ${JSON.stringify(properties)}`);
  const blob = JSON.stringify(properties);
  for (const [label, needle] of FORBIDDEN) {
    if (blob.includes(needle)) { console.log(`    LEAK: ${label}`); failures++; }
  }
  for (const [k, v] of Object.entries(properties)) {
    if (typeof v === "string" && v.includes("@")) { console.log(`    LEAK: "${k}"`); failures++; }
  }
}

const tripwireHeld = captured.length === goodCount;
const ok = failures === 0 && goodCount === 8 && tripwireHeld;
console.log(`\n${ok ? "PASS" : "FAIL"} — ${goodCount}/8 events captured, ${failures} leaks, ` +
  `tripwire ${tripwireHeld ? "dropped the bad event" : "LET IT THROUGH"}.`);
process.exit(ok ? 0 : 1);
