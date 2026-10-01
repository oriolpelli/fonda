import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { AI_MODELS, provenance } from "@/lib/ai-provenance";
import { track } from "@/lib/analytics";
import { buildHotelProfileSummary, HOTEL_PROFILE_COLUMNS } from "@/lib/hotel-profile";
import {
  CUSTOMER_RAW_SELECT,
  readNotes,
  readVip,
  RESERVATION_RAW_SELECT,
  withSlimRaw,
} from "@/lib/pms-fields";
import { pseudoName } from "@/lib/pseudonymise";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

/** Where a briefing run came from. */
export type BriefingTrigger = "cron" | "manual";

/**
 * Morning briefing generator.
 *
 * Pulls a hotel's operational data for today, pseudonymises guest surnames,
 * and asks Claude to write a plain-language briefing for the GM. The result is
 * saved to the `briefings` table and returned.
 *
 * Model note: intentionally kept on Opus. The morning briefing is the flagship,
 * customer-facing output GMs judge Fondas on, and it runs only once per day per
 * hotel — so the quality is worth the cost even though other surfaces have been
 * moved to Sonnet/Haiku. The ID lives in lib/ai-provenance.ts
 * (AI_MODELS.briefing); change it there to trade quality for cost.
 */
const LOW_OCCUPANCY_THRESHOLD = 0.6; // flag days under 60% occupancy
const OCCUPANCY_HORIZON_DAYS = 14;

export interface BriefingContent {
  summary: string;
  arrivals: string;
  emails: string;
  rate_alert: string;
  /**
   * What each section was built from (APP_UX_PROPOSAL.md §7.4).
   *
   * ADDITIVE AND OPTIONAL, which is the whole design. Briefs are stored as
   * JSON and every brief already written lacks this field; a required one
   * would either break the history page or need a backfill that invented
   * provenance for briefs nobody recorded it for. Old briefs render no chips,
   * which is the honest outcome — we genuinely do not know what they were
   * built from.
   *
   * Recorded at GENERATION time, not derived at read time, for the same
   * reason: "synced 06:40" is a fact about the morning the brief was made.
   */
  provenance?: BriefingProvenance;
}

export interface BriefingProvenance {
  /** IANA-free ISO timestamp of the PMS sync the brief was built on. */
  syncedAt: string | null;
  /** True when the overnight-email section had mail to summarise. */
  usedInbox: boolean;
  /** True when house settings shaped the wording. */
  usedHouseSettings: boolean;
}

const BRIEFING_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "Opening overview of the day in prose.",
    },
    arrivals: {
      type: "string",
      description:
        "Arrivals and departures, VIP highlights, and special requests, in prose.",
    },
    emails: {
      type: "string",
      description: "Summary of overnight guest emails needing attention.",
    },
    rate_alert: {
      type: "string",
      description:
        "Occupancy / rate alerts for the next 14 days, or a note that none apply.",
    },
  },
  required: ["summary", "arrivals", "emails", "rate_alert"],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Timezone-aware day boundaries
// ---------------------------------------------------------------------------

/** Offset (localTime − UTC) in ms for `tz` at the given instant. */
function tzOffsetMs(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

/** UTC instant of local midnight for `dateStr` (YYYY-MM-DD) in `tz`. */
function zonedMidnightUtc(tz: string, dateStr: string): Date {
  const naive = new Date(`${dateStr}T00:00:00Z`);
  return new Date(naive.getTime() - tzOffsetMs(tz, naive));
}

/** Local calendar date (YYYY-MM-DD) for an instant in `tz`. */
function localDate(tz: string, instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Reading the PMS payload: the shared readers in lib/pms-fields.ts, so the
// brief, Home and Ask can never disagree about who is a VIP or what a note
// says. (This file used to carry its own copies; they were identical.)
// ---------------------------------------------------------------------------

/** The reservation columns the brief reads, with only the `raw` keys it needs. */
interface BriefReservationRow {
  mews_id: string;
  state: string | null;
  start_utc: string | null;
  end_utc: string | null;
  customer_mews_id: string | null;
  adult_count: number | null;
  child_count: number | null;
  raw: Json;
}

interface BriefCustomerRow {
  mews_id: string;
  first_name: string | null;
  last_name: string | null;
  raw: Json;
}

const LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  ca: "Catalan",
};

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export async function generateBriefing(
  hotelId: string,
  /** Where the run came from — the scheduled send, or a GM pressing refresh. */
  trigger: BriefingTrigger = "cron"
): Promise<BriefingContent> {
  const admin = createAdminClient();

  const { data: hotel, error: hotelError } = await admin
    .from("hotels")
    .select("id, name, timezone, rooms_count, last_synced_at")
    .eq("id", hotelId)
    .single();
  if (hotelError || !hotel) {
    throw new Error(`Hotel ${hotelId} not found: ${hotelError?.message ?? ""}`);
  }

  const { data: settings } = await admin
    .from("hotel_settings")
    .select(`gm_name, briefing_language, ${HOTEL_PROFILE_COLUMNS}`)
    .eq("hotel_id", hotelId)
    .maybeSingle();

  const tz = hotel.timezone || "UTC";
  const todayStr = localDate(tz, new Date());
  const todayStart = zonedMidnightUtc(tz, todayStr);
  const todayEnd = zonedMidnightUtc(tz, addDays(todayStr, 1));
  const horizonEnd = zonedMidnightUtc(
    tz,
    addDays(todayStr, OCCUPANCY_HORIZON_DAYS)
  );

  // Reservations overlapping [today, today+14d].
  const { data: reservationRows } = await admin
    .from("reservations")
    .select(
      `mews_id, state, start_utc, end_utc, customer_mews_id, adult_count, child_count, ${RESERVATION_RAW_SELECT}`
    )
    .eq("hotel_id", hotelId)
    .lt("start_utc", horizonEnd.toISOString())
    .gt("end_utc", todayStart.toISOString())
    .overrideTypes<BriefReservationRow[]>();
  const reservations = withSlimRaw<BriefReservationRow>(
    reservationRows ?? [],
    "reservation"
  );

  const active = reservations.filter(
    (r) => r.state !== "Canceled" && r.start_utc && r.end_utc
  );

  const arrivalsRaw = active.filter(
    (r) => r.start_utc! >= todayStart.toISOString() && r.start_utc! < todayEnd.toISOString()
  );
  const departures = active.filter(
    (r) => r.end_utc! >= todayStart.toISOString() && r.end_utc! < todayEnd.toISOString()
  );
  const inHouse = active.filter(
    (r) =>
      r.start_utc! < todayStart.toISOString() &&
      r.end_utc! > todayEnd.toISOString()
  );

  // Guest profiles for today's arrivals (pseudonymised).
  const arrivalCustomerIds = [
    ...new Set(arrivalsRaw.map((r) => r.customer_mews_id).filter(Boolean)),
  ] as string[];
  const customerById = new Map<
    string,
    { first_name: string | null; last_name: string | null; raw: Json }
  >();
  if (arrivalCustomerIds.length > 0) {
    const { data: customers } = await admin
      .from("customers")
      .select(`mews_id, first_name, last_name, ${CUSTOMER_RAW_SELECT}`)
      .eq("hotel_id", hotelId)
      .in("mews_id", arrivalCustomerIds)
      .overrideTypes<BriefCustomerRow[]>();
    for (const c of withSlimRaw<BriefCustomerRow>(customers ?? [], "customer")) {
      customerById.set(c.mews_id, c);
    }
  }

  const arrivals = arrivalsRaw.map((r) => {
    const c = r.customer_mews_id
      ? customerById.get(r.customer_mews_id)
      : undefined;
    return {
      guest: pseudoName(c?.first_name, c?.last_name),
      adults: r.adult_count ?? undefined,
      children: r.child_count ?? undefined,
      vip: c ? readVip(c.raw) : false,
      specialRequests: readNotes(r.raw),
    };
  });

  // Overnight emails: classified, not yet replied (last 24h).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: emails } = await admin
    .from("emails")
    .select("from_email, subject, classification, status")
    .eq("hotel_id", hotelId)
    .gte("created_at", since)
    .in("status", ["pending", "needs_attention"]);

  // Occupancy per day across the horizon.
  const occupancy: { date: string; occupancyPct: number }[] = [];
  for (let i = 0; i < OCCUPANCY_HORIZON_DAYS; i++) {
    const dayStr = addDays(todayStr, i);
    const dayStart = zonedMidnightUtc(tz, dayStr).toISOString();
    const dayEnd = zonedMidnightUtc(tz, addDays(dayStr, 1)).toISOString();
    const occupied = active.filter(
      (r) => r.start_utc! < dayEnd && r.end_utc! > dayStart
    ).length;
    occupancy.push({
      date: dayStr,
      occupancyPct: hotel.rooms_count > 0 ? occupied / hotel.rooms_count : 0,
    });
  }
  const lowOccupancyDays = occupancy
    .filter((o) => o.occupancyPct < LOW_OCCUPANCY_THRESHOLD)
    .map((o) => ({ date: o.date, occupancyPct: Math.round(o.occupancyPct * 100) }));

  const language = LANGUAGES[settings?.briefing_language ?? "en"] ?? "English";

  const data = {
    hotel: { name: hotel.name, date: todayStr, rooms: hotel.rooms_count },
    gmName: settings?.gm_name ?? null,
    todayOccupancyPct: Math.round((occupancy[0]?.occupancyPct ?? 0) * 100),
    arrivals,
    departures: departures.map((r) => ({
      guest: r.customer_mews_id
        ? pseudoName(
            customerById.get(r.customer_mews_id)?.first_name,
            customerById.get(r.customer_mews_id)?.last_name
          )
        : "Guest",
    })),
    inHouseCount: inHouse.length,
    overnightEmails: (emails ?? []).map((e) => ({
      from: e.from_email,
      subject: e.subject,
      classification: e.classification,
    })),
    lowOccupancyDays,
  };

  const system = [
    `You are Fondas, an operations assistant for ${hotel.name}.`,
    `Write the general manager's morning briefing in ${language}.`,
    settings?.gm_name ? `Address the GM as ${settings.gm_name}.` : "",
    "Write in warm, professional prose — full sentences and short paragraphs, NOT bullet points.",
    `Always refer to the hotel by name (${hotel.name}).`,
    "Cover: today's arrivals and departures, any VIP guests, special requests, an overnight email summary, and occupancy/rate alerts for the next 14 days.",
    buildHotelProfileSummary(settings),
    "If a section has nothing noteworthy, say so briefly rather than inventing detail.",
    "Guest surnames have already been reduced to initials for privacy — keep them that way.",
    "Do not expose internal IDs.",
  ]
    .filter(Boolean)
    .join(" ");

  const client = new Anthropic();
  const response = await client.messages.create({
    model: AI_MODELS.briefing,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: BRIEFING_SCHEMA },
    },
    system,
    messages: [{ role: "user", content: JSON.stringify(data) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no briefing content.");
  }
  const content = JSON.parse(textBlock.text) as BriefingContent;
  const made = provenance("briefing");

  // Stamped here rather than inferred when the brief is read: "synced 06:40"
  // describes the morning this brief was made, and by the time anyone opens
  // the history page the PMS has synced a hundred times since.
  content.provenance = {
    syncedAt: hotel.last_synced_at ?? null,
    usedInbox: (emails ?? []).length > 0,
    usedHouseSettings: Boolean(settings?.gm_name || settings?.positioning_vibe),
  };

  const { error: saveError } = await admin.from("briefings").insert({
    hotel_id: hotelId,
    content_json: content as unknown as Json,
    // Art. 50(2) evidence (migration 0025). generated_at is the row default.
    model: made.model,
    prompt_version: made.promptVersion,
  });
  if (saveError) {
    throw new Error(`Failed to save briefing: ${saveError.message}`);
  }

  // After the save, so the event means "a brief exists", not "we tried".
  track(hotelId, "brief_generated", { trigger });

  return content;
}
