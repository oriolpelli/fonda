import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesInsert } from "@/types/database";

/**
 * Check-in time chaser. Generates personalised follow-up email drafts for
 * confirmed guests arriving in the next 7 days whose arrival time we don't know
 * yet. Drafts are saved as pending checkin_chasers for the GM to review + send.
 *
 * Model note: claude-opus-4-8 (no temperature param — see lib/email-processor).
 */
const CHASER_MODEL = "claude-opus-4-8";
const HORIZON_DAYS = 7;
const DEDUPE_DAYS = 7;

const LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish",
};

function startOfDayUtc(offsetDays = 0): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + offsetDays
    )
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

function extractText(response: Anthropic.Message): string {
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Claude returned no text content.");
  }
  return block.text.trim();
}

async function generateChase(
  client: Anthropic,
  args: {
    hotelName: string;
    guestFirstName: string | null;
    checkInDate: string;
    arrivalInstructions: string | null;
    language: string;
  }
): Promise<string> {
  const { hotelName, guestFirstName, checkInDate, arrivalInstructions, language } =
    args;

  const system = [
    `You are writing a short, warm email from ${hotelName} to a guest arriving on ${formatDate(
      checkInDate
    )}.`,
    `Politely ask the guest what time they expect to arrive, so the team can prepare.`,
    guestFirstName ? `Address the guest as ${guestFirstName}.` : "",
    arrivalInstructions
      ? `Include these arrival instructions where helpful: ${arrivalInstructions}`
      : "",
    `Write in ${language}.`,
    "Output ONLY the email body — no subject line, no preamble, no commentary. Keep it to a few sentences.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: CHASER_MODEL,
    max_tokens: 800,
    output_config: { effort: "low" },
    system,
    messages: [
      {
        role: "user",
        content: "Write the arrival-time request email for this guest.",
      },
    ],
  });
  return extractText(response);
}

/**
 * Builds pending chaser drafts for a hotel. Returns the number created.
 */
export async function runCheckinChaser(hotelId: string): Promise<number> {
  const admin = createAdminClient();

  const { data: hotel } = await admin
    .from("hotels")
    .select("name")
    .eq("id", hotelId)
    .single();
  const { data: settings } = await admin
    .from("hotel_settings")
    .select("arrival_instructions, briefing_language")
    .eq("hotel_id", hotelId)
    .maybeSingle();

  // Confirmed arrivals from tomorrow through +7 days, with no known arrival time.
  // (Excluding today's arrivals == "no same-day chasing".)
  const fromUtc = startOfDayUtc(1).toISOString();
  const toUtc = startOfDayUtc(HORIZON_DAYS + 1).toISOString();

  const { data: reservations } = await admin
    .from("reservations")
    .select("mews_id, start_utc, customer_mews_id")
    .eq("hotel_id", hotelId)
    .eq("state", "Confirmed")
    .is("arrival_time", null)
    .gte("start_utc", fromUtc)
    .lt("start_utc", toUtc);

  if (!reservations || reservations.length === 0) return 0;

  // Skip reservations already chased (any status) within the dedupe window.
  const since = new Date(
    Date.now() - DEDUPE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: recent } = await admin
    .from("checkin_chasers")
    .select("reservation_id")
    .eq("hotel_id", hotelId)
    .gte("created_at", since);
  const chased = new Set((recent ?? []).map((c) => c.reservation_id));

  const todo = reservations.filter(
    (r) => r.start_utc && !chased.has(r.mews_id)
  );
  if (todo.length === 0) return 0;

  // Guest profiles for the remaining reservations.
  const guestIds = [
    ...new Set(todo.map((r) => r.customer_mews_id).filter(Boolean)),
  ] as string[];
  const guestById = new Map<
    string,
    { first_name: string | null; email: string | null; language_code: string | null }
  >();
  if (guestIds.length > 0) {
    const { data: customers } = await admin
      .from("customers")
      .select("mews_id, first_name, email, language_code")
      .eq("hotel_id", hotelId)
      .in("mews_id", guestIds);
    for (const c of customers ?? []) guestById.set(c.mews_id, c);
  }

  const client = new Anthropic();
  const rows: TablesInsert<"checkin_chasers">[] = [];

  for (const r of todo) {
    const guest = r.customer_mews_id
      ? guestById.get(r.customer_mews_id)
      : undefined;
    if (!guest?.email) continue; // no address to chase

    const langCode = guest.language_code ?? settings?.briefing_language ?? "en";
    const draft = await generateChase(client, {
      hotelName: hotel?.name ?? "the hotel",
      guestFirstName: guest.first_name ?? null,
      checkInDate: r.start_utc!,
      arrivalInstructions: settings?.arrival_instructions ?? null,
      language: LANGUAGES[langCode] ?? "English",
    });

    rows.push({
      hotel_id: hotelId,
      reservation_id: r.mews_id,
      guest_email: guest.email,
      draft_content: draft,
      status: "pending",
    });
  }

  if (rows.length === 0) return 0;

  const { error } = await admin.from("checkin_chasers").insert(rows);
  if (error) throw new Error(`Failed to save chasers: ${error.message}`);
  return rows.length;
}

/** Marks an `arrival_time` so a reservation stops being chased. Used by replies. */
export async function recordArrivalTime(
  hotelId: string,
  reservationMewsId: string,
  arrivalTime: string
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("reservations")
    .update({ arrival_time: arrivalTime })
    .eq("hotel_id", hotelId)
    .eq("mews_id", reservationMewsId);
}
