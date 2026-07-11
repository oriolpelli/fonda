import "server-only";

import type { RoomType, Upsell } from "@/types";

/** Columns callers should append to their existing `hotel_settings` select(). */
export const HOTEL_PROFILE_COLUMNS =
  "star_rating, property_type, positioning_vibe, target_guest, " +
  "preferred_greeting, signoff_name, languages_spoken, " +
  "local_recommendations, review_summary, room_types, upsells";

export interface HotelProfileRow {
  star_rating: number | null;
  property_type: string | null;
  positioning_vibe: string | null;
  target_guest: string | null;
  preferred_greeting: string | null;
  signoff_name: string | null;
  languages_spoken: string | null;
  local_recommendations: string | null;
  review_summary: string | null;
  room_types: unknown;
  upsells: unknown;
}

const MAX_FIELD_CHARS = 320;
const MAX_ROOM_TYPE_ROWS = 10;
const MAX_UPSELL_ROWS = 12;

function truncate(s: string, max = MAX_FIELD_CHARS): string {
  const trimmed = s.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function parseRoomTypes(raw: unknown): RoomType[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r): r is RoomType =>
        !!r && typeof r === "object" && typeof (r as RoomType).name === "string"
    )
    .slice(0, MAX_ROOM_TYPE_ROWS);
}

/** Only active upsells with a label are worth injecting. */
function parseActiveUpsells(raw: unknown): Upsell[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (u): u is Upsell =>
        !!u &&
        typeof u === "object" &&
        typeof (u as Upsell).label === "string" &&
        (u as Upsell).label.trim().length > 0 &&
        (u as Upsell).active !== false
    )
    .slice(0, MAX_UPSELL_ROWS);
}

/**
 * Builds a short, structured hotel-voice summary for injection into AI system
 * prompts. Deliberately omits operational facts (wifi/parking/breakfast,
 * check-in/out times, policies, the raw TripAdvisor URL/highlights) to keep
 * the injected block small — those live in the profile for a future
 * guest-FAQ surface, not repeated on every AI call. Returns null when there's
 * no profile data worth injecting yet.
 */
export function buildHotelProfileSummary(
  row: HotelProfileRow | null | undefined
): string | null {
  if (!row) return null;
  const lines: string[] = [];

  const starProperty = [
    row.star_rating ? `${row.star_rating}-star` : null,
    row.property_type,
  ]
    .filter(Boolean)
    .join(" ");
  if (starProperty) lines.push(`Property: a ${starProperty} hotel.`);

  if (row.target_guest) lines.push(`Typical guest: ${truncate(row.target_guest)}.`);
  if (row.positioning_vibe) lines.push(`Voice/vibe: ${truncate(row.positioning_vibe)}.`);

  const greetSignoff = [
    row.preferred_greeting
      ? `open with something like "${truncate(row.preferred_greeting, 120)}"`
      : null,
    row.signoff_name ? `sign off as ${row.signoff_name}` : null,
  ]
    .filter(Boolean)
    .join("; ");
  if (greetSignoff) lines.push(`Greeting/sign-off: ${greetSignoff}.`);

  if (row.languages_spoken)
    lines.push(`Staff speak: ${truncate(row.languages_spoken, 120)}.`);

  const roomTypes = parseRoomTypes(row.room_types);
  if (roomTypes.length > 0) {
    const list = roomTypes.map((rt) => `${rt.name} x${rt.count}`).join(", ");
    lines.push(`Room types: ${list}.`);
  }

  const upsells = parseActiveUpsells(row.upsells);
  if (upsells.length > 0) {
    const list = upsells
      .map((u) => {
        const price = u.price.trim();
        const base = price ? `${u.label.trim()} (${price})` : u.label.trim();
        const note = u.notes?.trim();
        return note ? `${base} — ${truncate(note, 80)}` : base;
      })
      .join("; ");
    lines.push(
      `Paid extras available (quote these prices when a guest asks): ${list}.`
    );
  }

  if (row.local_recommendations)
    lines.push(
      `Local recommendations to mention when relevant: ${truncate(row.local_recommendations)}.`
    );

  if (row.review_summary)
    lines.push(`What guests consistently praise: ${truncate(row.review_summary)}.`);

  if (lines.length === 0) return null;
  return [
    "HOTEL PROFILE (use to match voice and local knowledge; do not quote verbatim unless natural):",
    ...lines,
  ].join("\n");
}
