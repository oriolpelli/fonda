import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailStatus } from "@/types";

/**
 * Email classifier + draft generator.
 *
 * processEmail(emailId, hotelId): classify a guest email, enrich it with any
 * matching reservation/guest, draft a reply (for non-complaints), and persist
 * the result to the emails table.
 *
 * Model note: the roadmap specified temperature 0.3 for drafts, but the current
 * default model (claude-opus-4-8) no longer accepts `temperature` (it 400s), so
 * consistency is steered via low effort + explicit instructions instead. Switch
 * EMAIL_MODEL to a temperature-capable model (e.g. claude-sonnet-4-5) if you
 * need the literal sampling control.
 */
const EMAIL_MODEL = "claude-opus-4-8";

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
    model: EMAIL_MODEL,
    max_tokens: 1024,
    output_config: {
      effort: "low",
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
    language: string;
    emailText: string;
    context: EnrichContext;
  }
): Promise<string> {
  const { hotelName, gmName, tone, language, emailText, context } = args;

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
    `Reply in ${language} — the same language as the guest's email.`,
    contextBlock,
    "Address the guest by name if it is known. Be helpful and accurate; never invent prices, policies, or availability you were not given — instead say you will confirm.",
    "Output ONLY the reply email body. No subject line, no preamble like 'Here is the draft', no commentary, no placeholders other than the sign-off name.",
  ].join("\n");

  const response = await client.messages.create({
    model: EMAIL_MODEL,
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
      .select("gm_name, tone_guidelines")
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
      language,
      emailText,
      context,
    });
    status = "pending";
  }

  const { error: updateError } = await admin
    .from("emails")
    .update({ classification, draft_reply: draft, status })
    .eq("id", emailId);
  if (updateError) {
    throw new Error(`Failed to save processed email: ${updateError.message}`);
  }

  return { classification, status, drafted: !NO_DRAFT.has(classification) };
}

/**
 * Processes every not-yet-classified email for a hotel (e.g. freshly ingested
 * from Gmail). Isolates failures so one bad email doesn't stop the batch.
 * Returns the number processed.
 */
export async function processNewEmails(
  hotelId: string,
  limit = 50
): Promise<number> {
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
  for (const { id } of data ?? []) {
    try {
      await processEmail(id, hotelId);
      processed++;
    } catch {
      // Leave the email unclassified; it'll be retried next run.
    }
  }
  return processed;
}
