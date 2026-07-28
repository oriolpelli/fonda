import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { buildHotelProfileSummary, HOTEL_PROFILE_COLUMNS } from "@/lib/hotel-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailStatus } from "@/types";

/**
 * Email classifier + draft generator.
 *
 * processEmail(emailId, hotelId): classify a guest email, enrich it with any
 * matching reservation/guest, draft a reply (for non-complaints), and persist
 * the result to the emails table.
 *
 * Model split (cost/quality): classification is a cheap, structured task, so it
 * runs on Haiku; drafting is guest-facing, so it runs on Sonnet — a strong
 * balance of quality and cost. Dial either up (e.g. claude-opus-5) as needed.
 *
 * IMPORTANT — `output_config.effort` is NOT supported on Haiku 4.5 and returns
 * a 400 ("This model does not support the effort parameter"). It IS supported
 * on Sonnet 4.6 (low/medium/high/max). Structured output (`format`) works on
 * both. Sending `effort` to Haiku is what silently broke every classification
 * until 28 Jul — if you change either model, re-check which knobs it accepts.
 */
const EMAIL_CLASSIFY_MODEL = "claude-haiku-4-5-20251001";
const EMAIL_DRAFT_MODEL = "claude-sonnet-4-6";

export const EMAIL_CLASSIFICATIONS = [
  "booking_inquiry",
  "modification_request",
  "cancellation_request",
  "special_request",
  "arrival_info",
  "complaint",
  "general_inquiry",
  "irrelevant",
] as const;

export type EmailClassification = (typeof EMAIL_CLASSIFICATIONS)[number];

/** Classifications that never get an auto-draft. */
const NO_DRAFT: ReadonlySet<EmailClassification> = new Set([
  "complaint",
  "irrelevant",
]);

const CLASSIFY_SCHEMA = {
  type: "object",
  properties: {
    classification: {
      type: "string",
      enum: [...EMAIL_CLASSIFICATIONS],
    },
    language: {
      type: "string",
      description: "ISO 639-1 code of the email's language (e.g. en, es, fr).",
    },
    bookingReference: {
      type: "string",
      description:
        "Any booking/reservation reference mentioned in the email, or an empty string if none.",
    },
  },
  required: ["classification", "language", "bookingReference"],
  additionalProperties: false,
} as const;

interface Classification {
  classification: EmailClassification;
  language: string;
  bookingReference: string;
}

function extractText(response: Anthropic.Message): string {
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text content.");
  }
  return block.text;
}

function emailToText(email: {
  from_email: string | null;
  subject: string | null;
  body: string | null;
}): string {
  return [
    `From: ${email.from_email ?? "unknown"}`,
    `Subject: ${email.subject ?? "(no subject)"}`,
    "",
    email.body ?? "",
  ].join("\n");
}

async function classify(
  client: Anthropic,
  emailText: string
): Promise<Classification> {
  const response = await client.messages.create({
    model: EMAIL_CLASSIFY_MODEL,
    max_tokens: 1024,
    // No `effort` here: Haiku 4.5 rejects it. Structured output is supported.
    output_config: {
      format: { type: "json_schema", schema: CLASSIFY_SCHEMA },
    },
    system:
      "You classify inbound hotel guest emails. Choose the single best category, " +
      "detect the email's language, and extract any booking reference. " +
      "Use 'complaint' for any dissatisfaction or escalation, and 'irrelevant' " +
      "for spam, newsletters, or non-guest mail.",
    messages: [{ role: "user", content: emailText }],
  });
  return JSON.parse(extractText(response)) as Classification;
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

type Admin = ReturnType<typeof createAdminClient>;

interface EnrichContext {
  reservation: Record<string, unknown> | null;
  guest: Record<string, unknown> | null;
}

async function enrich(
  admin: Admin,
  hotelId: string,
  fromEmail: string | null,
  bookingReference: string
): Promise<EnrichContext> {
  // 1) By booking reference (sanitized to keep the .or() filter safe).
  const ref = bookingReference.replace(/[^a-zA-Z0-9-]/g, "");
  if (ref) {
    const { data: reservation } = await admin
      .from("reservations")
      .select("*")
      .eq("hotel_id", hotelId)
      .or(`number.eq.${ref},mews_id.eq.${ref},group_id.eq.${ref}`)
      .limit(1)
      .maybeSingle();
    if (reservation) {
      const { data: guest } = reservation.customer_mews_id
        ? await admin
            .from("customers")
            .select("first_name, last_name, email, phone, language_code")
            .eq("hotel_id", hotelId)
            .eq("mews_id", reservation.customer_mews_id)
            .maybeSingle()
        : { data: null };
      return { reservation, guest };
    }
  }

  // 2) Fall back to the sender's email in the guests (customers) table.
  if (fromEmail) {
    const { data: guest } = await admin
      .from("customers")
      .select("mews_id, first_name, last_name, email, phone, language_code")
      .eq("hotel_id", hotelId)
      .eq("email", fromEmail)
      .limit(1)
      .maybeSingle();
    if (guest) {
      const reservations = admin
        .from("reservations")
        .select("*")
        .eq("hotel_id", hotelId)
        .eq("customer_mews_id", guest.mews_id);

      // A guest can hold several bookings. Prefer the stay they're on right
      // now — otherwise a future booking would win and their in-stay request
      // would be filed under pre-arrival (FONDA_REDESIGN_SPEC.md §2).
      const now = new Date().toISOString();
      const { data: current } = await reservations
        .lte("start_utc", now)
        .gte("end_utc", now)
        .limit(1)
        .maybeSingle();
      if (current) return { reservation: current, guest };

      const { data: reservation } = await admin
        .from("reservations")
        .select("*")
        .eq("hotel_id", hotelId)
        .eq("customer_mews_id", guest.mews_id)
        .order("start_utc", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { reservation, guest };
    }
  }

  return { reservation: null, guest: null };
}

// ---------------------------------------------------------------------------
// Draft generation
// ---------------------------------------------------------------------------

async function generateDraft(
  client: Anthropic,
  args: {
    hotelName: string;
    gmName: string | null;
    tone: string | null;
    profileSummary: string | null;
    language: string;
    emailText: string;
    context: EnrichContext;
  }
): Promise<string> {
  const { hotelName, gmName, tone, profileSummary, language, emailText, context } = args;

  const contextBlock =
    context.reservation || context.guest
      ? `Use this booking context when relevant (do not quote raw IDs):\n${JSON.stringify(
          context
        )}`
      : "No matching reservation was found for this sender.";

  const system = [
    `You are drafting an email reply on behalf of ${hotelName}.`,
    `Sign off as ${gmName ?? "the front desk team"}.`,
    `Tone: ${tone ?? "warm, professional, and concise."}`,
    profileSummary,
    `Reply in ${language} — the same language as the guest's email.`,
    contextBlock,
    "Address the guest by name if it is known. Be helpful and accurate; never invent prices, policies, or availability you were not given — instead say you will confirm.",
    "Output ONLY the reply email body. No subject line, no preamble like 'Here is the draft', no commentary, no placeholders other than the sign-off name.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: EMAIL_DRAFT_MODEL,
    max_tokens: 1500,
    output_config: { effort: "low" },
    system,
    messages: [{ role: "user", content: emailText }],
  });
  return extractText(response).trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ProcessResult {
  classification: EmailClassification;
  status: EmailStatus;
  drafted: boolean;
}

export async function processEmail(
  emailId: string,
  hotelId: string
): Promise<ProcessResult> {
  const admin = createAdminClient();

  const { data: email, error } = await admin
    .from("emails")
    .select("id, from_email, subject, body")
    .eq("id", emailId)
    .eq("hotel_id", hotelId)
    .single();
  if (error || !email) {
    throw new Error(`Email ${emailId} not found for hotel ${hotelId}.`);
  }

  const [{ data: hotel }, { data: settings }] = await Promise.all([
    admin.from("hotels").select("name").eq("id", hotelId).single(),
    admin
      .from("hotel_settings")
      .select(`gm_name, tone_guidelines, ${HOTEL_PROFILE_COLUMNS}`)
      .eq("hotel_id", hotelId)
      .maybeSingle(),
  ]);

  const client = new Anthropic();
  const emailText = emailToText(email);

  const { classification, language, bookingReference } = await classify(
    client,
    emailText
  );
  const context = await enrich(admin, hotelId, email.from_email, bookingReference);

  let draft: string | null = null;
  let status: EmailStatus;
  if (classification === "complaint") {
    // Flag for personal GM review; no auto-draft.
    status = "needs_attention";
  } else if (classification === "irrelevant") {
    status = "ignored";
  } else {
    draft = await generateDraft(client, {
      hotelName: hotel?.name ?? "the hotel",
      gmName: settings?.gm_name ?? null,
      tone: settings?.tone_guidelines ?? null,
      profileSummary: buildHotelProfileSummary(settings),
      language,
      emailText,
      context,
    });
    status = "pending";
  }

  // Persist *which* reservation/guest matched, not what phase of their stay
  // they're in. The phase is derived on every read (lib/inbox.ts) so it can't
  // go stale as the guest checks out — see FONDA_REDESIGN_SPEC.md §2.
  const reservationMewsId =
    (context.reservation?.mews_id as string | undefined) ?? null;
  const customerMewsId =
    (context.reservation?.customer_mews_id as string | undefined) ??
    (context.guest?.mews_id as string | undefined) ??
    null;

  const { error: updateError } = await admin
    .from("emails")
    .update({
      classification,
      draft_reply: draft,
      status,
      reservation_mews_id: reservationMewsId,
      customer_mews_id: customerMewsId,
    })
    .eq("id", emailId);
  if (updateError) {
    throw new Error(`Failed to save processed email: ${updateError.message}`);
  }

  return { classification, status, drafted: !NO_DRAFT.has(classification) };
}

export interface ProcessBatchResult {
  processed: number;
  /** Emails left unclassified because processing threw. */
  failed: number;
  /** Message from the last failure, for the caller to log. */
  lastError: string | null;
}

/**
 * Processes every not-yet-classified email for a hotel (e.g. freshly ingested
 * from Gmail). Isolates failures so one bad email doesn't stop the batch.
 *
 * Failures are *counted and reported*, not swallowed. Silently continuing is
 * what let a 400 from the classifier look like a healthy cron for two days:
 * every email failed, the job logged "success", and nothing surfaced it.
 */
export async function processNewEmails(
  hotelId: string,
  limit = 50
): Promise<ProcessBatchResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("emails")
    .select("id")
    .eq("hotel_id", hotelId)
    .is("classification", null)
    .limit(limit);
  if (error) {
    throw new Error(`Failed to list unprocessed emails: ${error.message}`);
  }

  let processed = 0;
  let failed = 0;
  let lastError: string | null = null;
  for (const { id } of data ?? []) {
    try {
      await processEmail(id, hotelId);
      processed++;
    } catch (err) {
      // Leave the email unclassified; it'll be retried next run — but record
      // why, so a systemic failure can't masquerade as a quiet inbox.
      failed++;
      lastError = (err as Error).message;
    }
  }
  return { processed, failed, lastError };
}
