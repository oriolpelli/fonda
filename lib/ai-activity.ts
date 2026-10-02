import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { modelName } from "@/lib/ai-features";
import { pseudoName } from "@/lib/pseudonymise";
import { fetchInChunks } from "@/lib/supabase/paged";
import type { Database } from "@/types/database";

/**
 * AI activity (AI_ACT_PROMPTS.md A8): what Fondas generated for this hotel in
 * the last 30 days and what happened to it — human oversight, made visible.
 *
 * PER HOTEL, NEVER PER PERSON. Nothing here reads, counts or returns who sent,
 * edited or reported anything: evaluating or monitoring individual staff is
 * Annex III point 4 (ROADMAP §5 #10, AI_ACT_PROMPTS.md §R "Team activity").
 * If a future change wants "who", it needs that rule changed first.
 *
 * The top numbers are draft_edit_events' (the acceptance rollup), so they are
 * the same figures the PMF metric steers by: sent as drafted = unedited
 * single sends; edited = minor + major edits; bulk sends counted apart, since
 * they had no editor. "Drafts written" counts the drafts themselves (replies
 * and arrival-time requests with provenance, migration 0025).
 *
 * Reads as the signed-in user (RLS), all at once, and only the columns shown —
 * never a draft, a body or an address. Guests appear as first name + initial
 * (lib/pseudonymise.ts), resolved only for the page being shown.
 */

export const ACTIVITY_DAYS = 30;
export const ACTIVITY_PAGE_SIZE = 25;
/** Per source, per period — far above a boutique hotel's month. */
const SOURCE_CAP = 1000;

export type ActivityType = "reply" | "chaser" | "brief";
export type ActivityOutcome = "asDrafted" | "edited" | "bulk" | "notSent" | "written";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  at: string;
  outcome: ActivityOutcome;
  /** "Claude Sonnet 4.6", or null when not recorded (before 0025). */
  model: string | null;
  /** First name + initial; null for a brief, or when no guest matched. */
  guest: string | null;
  /** Dashboard path (unlocalised) to the item. */
  path: string;
}

export interface ActivityTotals {
  generated: number;
  sentAsDrafted: number;
  edited: number;
  bulk: number;
}

export interface AiActivity {
  totals: ActivityTotals;
  items: ActivityItem[];
  totalItems: number;
  page: number;
  pages: number;
}

interface DraftRow {
  id: string;
  draft_generated_at: string | null;
  draft_model: string | null;
  status: string;
  sent_via: "single" | "bulk" | null;
  draft_edited: boolean | null;
}

function outcomeOf(row: DraftRow): ActivityOutcome {
  const sent = row.status === "sent" || row.status === "replied";
  if (!sent) return "notSent";
  if (row.sent_via === "bulk") return "bulk";
  return row.draft_edited ? "edited" : "asDrafted";
}

export async function loadAiActivity(
  db: SupabaseClient<Database>,
  hotelId: string,
  page: number,
  now: Date = new Date()
): Promise<AiActivity | null> {
  const from = new Date(now.getTime() - ACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const to = now.toISOString();

  const [summary, replies, chasers, briefs] = await Promise.all([
    db
      .rpc("draft_acceptance_summary", { p_hotel_id: hotelId, p_from: from, p_to: to })
      .single(),
    db
      .from("emails")
      .select("id, draft_generated_at, draft_model, status, sent_via, draft_edited, customer_mews_id")
      .eq("hotel_id", hotelId)
      .gte("draft_generated_at", from)
      .order("draft_generated_at", { ascending: false })
      .limit(SOURCE_CAP),
    db
      .from("checkin_chasers")
      .select("id, draft_generated_at, draft_model, status, sent_via, draft_edited, reservation_id")
      .eq("hotel_id", hotelId)
      .gte("draft_generated_at", from)
      .order("draft_generated_at", { ascending: false })
      .limit(SOURCE_CAP),
    db
      .from("briefings")
      .select("id, generated_at, model")
      .eq("hotel_id", hotelId)
      .gte("generated_at", from)
      .order("generated_at", { ascending: false })
      .limit(SOURCE_CAP),
  ]);
  if (summary.error || replies.error || chasers.error || briefs.error) return null;

  const s = summary.data;
  const bulk = Number(s.bulk_count);
  const totals: ActivityTotals = {
    generated: (replies.data ?? []).length + (chasers.data ?? []).length,
    sentAsDrafted: Math.max(Number(s.none_count) - bulk, 0),
    edited: Number(s.minor_count) + Number(s.major_count),
    bulk,
  };

  type Keyed = ActivityItem & { customerId?: string | null; reservationRef?: string | null };
  const all: Keyed[] = [
    ...(replies.data ?? []).map((r) => ({
      id: r.id,
      type: "reply" as const,
      at: r.draft_generated_at!,
      outcome: outcomeOf(r),
      model: r.draft_model ? modelName(r.draft_model) : null,
      guest: null,
      path: `/dashboard/communications?email=${r.id}`,
      customerId: r.customer_mews_id,
    })),
    ...(chasers.data ?? []).map((c) => ({
      id: c.id,
      type: "chaser" as const,
      at: c.draft_generated_at!,
      outcome: outcomeOf(c),
      model: c.draft_model ? modelName(c.draft_model) : null,
      guest: null,
      path: "/dashboard/arrivals",
      reservationRef: c.reservation_id,
    })),
    ...(briefs.data ?? []).map((b) => ({
      id: b.id,
      type: "brief" as const,
      at: b.generated_at,
      outcome: "written" as const,
      model: b.model ? modelName(b.model) : null,
      guest: null,
      path: "/dashboard/brief",
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  const pages = Math.max(1, Math.ceil(all.length / ACTIVITY_PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const slice = all.slice((current - 1) * ACTIVITY_PAGE_SIZE, current * ACTIVITY_PAGE_SIZE);

  // Names for this page only: replies by their guest, arrival-time requests
  // through their booking. Two small reads at most, together.
  const reservationRefs = [
    ...new Set(slice.map((i) => i.reservationRef).filter((v): v is string => Boolean(v))),
  ];
  const reservations = reservationRefs.length
    ? await fetchInChunks<{ mews_id: string; customer_mews_id: string | null }>(
        reservationRefs,
        (chunk) =>
          db
            .from("reservations")
            .select("mews_id, customer_mews_id")
            .eq("hotel_id", hotelId)
            .in("mews_id", chunk)
      )
    : [];
  const customerOfReservation = new Map(reservations.map((r) => [r.mews_id, r.customer_mews_id]));
  const customerIds = [
    ...new Set(
      slice
        .map((i) => i.customerId ?? (i.reservationRef ? customerOfReservation.get(i.reservationRef) : null))
        .filter((v): v is string => Boolean(v))
    ),
  ];
  const customers = customerIds.length
    ? await fetchInChunks<{ mews_id: string; first_name: string | null; last_name: string | null }>(
        customerIds,
        (chunk) =>
          db
            .from("customers")
            .select("mews_id, first_name, last_name")
            .eq("hotel_id", hotelId)
            .in("mews_id", chunk)
      )
    : [];
  const nameOf = new Map(
    customers
      .filter((c) => (c.first_name ?? "").trim() || (c.last_name ?? "").trim())
      .map((c) => [c.mews_id, pseudoName(c.first_name, c.last_name)])
  );

  const items: ActivityItem[] = slice.map(({ customerId, reservationRef, ...item }) => {
    const id = customerId ?? (reservationRef ? customerOfReservation.get(reservationRef) : null);
    return { ...item, guest: id ? nameOf.get(id) ?? null : null };
  });

  return { totals, items, totalItems: all.length, page: current, pages };
}
