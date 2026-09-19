import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type {
  GuestPreference,
  GuestProfile,
  Occasion,
  TripPurpose,
} from "@/lib/guests";
import { reduceSurnames } from "@/lib/pseudonymise";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/**
 * What Fondas works out about a guest from their mail and their bookings
 * (APP_UX_PROPOSAL.md §5.4).
 *
 * Haiku, same shape as lib/email-processor.ts's classifier — a small, cheap,
 * structured call. No `output_config.effort`: Haiku 4.5 rejects it, which is the
 * mistake that silently broke every classification once already.
 *
 * TWO WRITE RULES, and they are the reason this file exists rather than an
 * inline update somewhere:
 *
 *   1. `notes` IS NEVER WRITTEN. Not guarded against, not merged carefully —
 *      the column does not appear in the update payload below. A GM has to be
 *      able to write "difficult about noise, do not put in 204" and find it
 *      there tomorrow, unedited. The moment a model can rewrite that, nobody
 *      writes anything worth having.
 *
 *   2. A STAFF VALUE IS NEVER OVERWRITTEN. Every preference carries a source;
 *      a preference a human typed is source 'staff' and survives every later
 *      run. Inference fills blanks and refreshes what it wrote before. It does
 *      not argue with the front desk.
 *
 * The input is PSEUDONYMISED the way the briefing's is (lib/pseudonymise.ts):
 * the model is working out whether this was a honeymoon, and it does not need
 * the surname to do it.
 */

const INFERENCE_MODEL = "claude-haiku-4-5-20251001";

/** Re-run at most this often, however many times a record is opened. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const SCHEMA = {
  type: "object",
  properties: {
    trip_purpose: {
      type: "string",
      enum: ["leisure", "business", "family", "romantic", "group", "unknown"],
    },
    occasion: {
      type: ["string", "null"],
      enum: ["birthday", "anniversary", "honeymoon", null],
    },
    preferences: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          source: { type: "string", enum: ["email", "reservation"] },
        },
        required: ["text", "source"],
        additionalProperties: false,
      },
    },
  },
  required: ["trip_purpose", "occasion", "preferences"],
  additionalProperties: false,
} as const;

interface InferenceResult {
  trip_purpose: TripPurpose;
  occasion: Occasion | null;
  preferences: { text: string; source: "email" | "reservation" }[];
}

function extractText(response: Anthropic.Message): string {
  return response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
}

export interface InferenceInput {
  hotelId: string;
  customerMewsId: string;
  /** Subjects and bodies of this guest's mail, newest first. */
  emails: { subject: string | null; body: string | null }[];
  /** The shape of the booking, which carries as much signal as the prose. */
  stay: {
    adults: number | null;
    children: number | null;
    nights: number | null;
    /** True when the stay covers a Friday or Saturday night. */
    weekend: boolean;
    /** Days between booking and arrival, when both are known. */
    leadTimeDays: number | null;
  };
  /** Real guest names, used only to strip them back out again. */
  names: { first: string | null; last: string | null }[];
  /** The profile as it stands — decides what may be written. */
  existing: GuestProfile;
}

/**
 * Whether a record's inference is worth (re-)running.
 *
 * Lazily, on first view, and at most daily. Never on a cron: inferring about
 * every guest of every hotel nightly would be both expensive and rude — most
 * records are never opened, and a guess nobody reads is a guess not worth
 * making.
 */
export function shouldInfer(
  profile: GuestProfile,
  latestEmailAt: string | null
): boolean {
  if (!profile.inferredAt) return true;
  const inferredAt = Date.parse(profile.inferredAt);
  if (Number.isNaN(inferredAt)) return true;
  if (latestEmailAt && Date.parse(latestEmailAt) > inferredAt) return true;
  return Date.now() - inferredAt > STALE_AFTER_MS;
}

/**
 * Runs the inference and merges it under the two write rules.
 *
 * Returns the merged profile, or the existing one unchanged if anything goes
 * wrong. A failed inference is a record with fewer guesses on it, which is a
 * perfectly good record — it must never be an error page.
 */
export async function inferGuestProfile(
  input: InferenceInput
): Promise<GuestProfile> {
  const { existing } = input;

  try {
    const transcript = input.emails
      .slice(0, 12)
      .map((e) =>
        reduceSurnames(
          `${e.subject ?? ""}\n${(e.body ?? "").slice(0, 1200)}`,
          input.names
        )
      )
      .join("\n---\n")
      .slice(0, 12_000);

    const shape = [
      input.stay.adults !== null ? `adults=${input.stay.adults}` : null,
      input.stay.children !== null ? `children=${input.stay.children}` : null,
      input.stay.nights !== null ? `nights=${input.stay.nights}` : null,
      `weekend=${input.stay.weekend}`,
      input.stay.leadTimeDays !== null
        ? `lead_time_days=${input.stay.leadTimeDays}`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    const client = new Anthropic();
    const response = await client.messages.create({
      model: INFERENCE_MODEL,
      max_tokens: 1024,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      system:
        "You infer a hotel guest's trip purpose, any special occasion, and " +
        "concrete stay preferences, from their correspondence and the shape " +
        "of their booking. Only state what the text supports: prefer " +
        "'unknown' and an empty list over a guess. A preference must be " +
        "actionable by a front desk — 'quiet room away from the lift', not " +
        "'wants a nice stay'. Surnames have already been shortened for " +
        "privacy; keep them that way.",
      messages: [
        {
          role: "user",
          content: `BOOKING SHAPE: ${shape}\n\nCORRESPONDENCE:\n${transcript}`,
        },
      ],
    });

    const result = JSON.parse(extractText(response)) as InferenceResult;

    // ── Rule 2: staff wins ────────────────────────────────────────────────
    const staffPreferences = existing.preferences.filter(
      (p) => p.source === "staff"
    );
    const staffTexts = new Set(
      staffPreferences.map((p) => p.text.trim().toLowerCase())
    );
    const now = new Date().toISOString();

    const inferred: GuestPreference[] = result.preferences
      .filter((p) => p.text.trim() && !staffTexts.has(p.text.trim().toLowerCase()))
      .map((p) => ({ text: p.text.trim(), source: p.source, at: now }));

    const merged: GuestProfile = {
      // A staff-set purpose or occasion is left alone. There is no `source` on
      // these two scalars, so "staff set it" is expressed the only way it can
      // be: a value that is already there is not replaced by inference, and
      // clearing one is a deliberate act in the UI.
      tripPurpose: existing.tripPurpose ?? result.trip_purpose,
      occasion: existing.occasion ?? result.occasion,
      preferences: [...staffPreferences, ...inferred],
      // Rule 1. Carried through untouched, and absent from the write below.
      notes: existing.notes,
      inferredAt: now,
    };

    const supabase = await createClient();
    await supabase.from("guest_profiles").upsert(
      {
        hotel_id: input.hotelId,
        customer_mews_id: input.customerMewsId,
        trip_purpose: merged.tripPurpose,
        occasion: merged.occasion,
        preferences: merged.preferences as unknown as Json,
        // `notes` IS DELIBERATELY ABSENT. An upsert that included it —
        // even set to its current value — would overwrite a note a colleague
        // saved between this record being read and this write landing.
        inferred_at: merged.inferredAt,
        updated_at: now,
      },
      { onConflict: "hotel_id,customer_mews_id" }
    );

    return merged;
  } catch {
    // A record with fewer guesses on it is still a good record.
    return existing;
  }
}
