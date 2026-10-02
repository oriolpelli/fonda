import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getHotel } from "@/lib/auth";
import { addDays } from "@/lib/occupancy";
import {
  RATE_HORIZON_NIGHTS,
  buildRateOutlook,
  type RateOutlook,
  type SnapshotNight,
  type StoredRateNight,
} from "@/lib/rate-math";
import { hotelToday } from "@/lib/stay-phase";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * The rate cache, read (B17). Two small reads in parallel — the 14 nights and
 * at most three snapshots of them — then lib/rate-math.ts does the rest.
 *
 * Takes the client as an argument because it has two kinds of caller: Home,
 * which reads as the signed-in user through RLS, and the brief and Ask, which
 * run without a session and use the service role (as lib/hotel-context.ts
 * explains). Never throws: before migration 0030 is applied, or with nothing
 * synced yet, the answer is null and every reader falls back to "no rates".
 */
export async function loadRateOutlook(
  db: SupabaseClient<Database>,
  hotelId: string,
  today: string
): Promise<RateOutlook | null> {
  const last = addDays(today, RATE_HORIZON_NIGHTS - 1);
  const [rows, snapshots] = await Promise.all([
    db
      .from("rate_nights")
      .select(
        "night, rooms_sold, priced_rooms, revenue_net, sell_from_net, sell_from_checked_at, currency"
      )
      .eq("hotel_id", hotelId)
      .gte("night", today)
      .lte("night", last),
    db
      .from("rate_snapshots")
      .select("as_of, night, rooms_sold, priced_rooms, revenue_net")
      .eq("hotel_id", hotelId)
      .in("as_of", [today, addDays(today, -1), addDays(today, -7)])
      .gte("night", today)
      .lte("night", last),
  ]);
  if (rows.error || snapshots.error) return null;
  return buildRateOutlook({
    today,
    rows: (rows.data ?? []) as StoredRateNight[],
    snapshots: (snapshots.data ?? []) as SnapshotNight[],
  });
}

/** What Home's strip needs: the outlook, and whether the source has rates. */
export interface HomeRates {
  outlook: RateOutlook | null;
  /** The Sheet import carries no charges or prices; say so, not "soon". */
  sourceHasRates: boolean;
}

/** Home's read: RLS-scoped, on the request's one hotel row (lib/auth.ts). */
export async function loadHomeRates(): Promise<HomeRates | null> {
  const [supabase, hotel] = await Promise.all([createClient(), getHotel()]);
  if (!hotel?.pms_connected) return null;
  const today = hotelToday(hotel.timezone);
  return {
    outlook: await loadRateOutlook(supabase, hotel.id, today),
    sourceHasRates: hotel.pms_type !== "sheet",
  };
}
