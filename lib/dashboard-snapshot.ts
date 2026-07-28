import "server-only";

import {
  addDays,
  arrivalsOn,
  departuresOn,
  occupancyOutlook,
  occupancyPct,
  occupiedOn,
  type OccupancyDay,
  type StayDates,
} from "@/lib/occupancy";
import { readNotes, readVip } from "@/lib/pms-fields";
import { hotelToday, localDateOf } from "@/lib/stay-phase";
import { fetchAllPages } from "@/lib/supabase/paged";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/**
 * The read model behind the Dashboard — "how is the hotel right now, and what
 * should I do first?".
 *
 * Read through the RLS-scoped server client, never the service-role admin
 * client: this runs for a signed-in user, so the database decides what they may
 * see (CLAUDE.md). `lib/hotel-context.ts` uses the admin client because it runs
 * in background jobs with no user session — a different situation, not a
 * precedent for this one.
 *
 * Everything here is derived per read and nothing is stored. Occupancy uses the
 * shared rule in lib/occupancy.ts so this page and the morning brief can never
 * quote different numbers.
 */

/** Nights of occupancy shown on the dashboard strip. */
export const OUTLOOK_DAYS = 14;

/**
 * How far either side of the window to reach in UTC before filtering on
 * hotel-local dates. One day absorbs any timezone offset (UTC−12 … UTC+14).
 */
const UTC_PAD_DAYS = 1;

/** MEWS reservation states we treat as real bookings. */
const CANCELLED_STATE = "Canceled";
const CONFIRMED_STATE = "Confirmed";

export interface VipArrival {
  /** Reservation id, so the item can link somewhere specific later. */
  reservationId: string;
  name: string;
}

export interface DashboardSnapshot {
  hotelName: string;
  timezone: string;
  /** Rooms in the hotel. Zero means it hasn't been set in Settings. */
  rooms: number;
  /** Today, in the hotel's timezone (YYYY-MM-DD). */
  today: string;
  /** A PMS is connected. False → the pre-sync empty state. */
  connected: boolean;
  /** A sync has completed at least once. */
  hasSyncedData: boolean;

  occupancyPct: number;
  freeRooms: number;
  checkinsToday: number;
  checkoutsToday: number;
  /** Occupancy for tonight and the next 13 nights. */
  outlook: OccupancyDay[];

  /** VIPs arriving today whose booking carries no note for the desk. */
  vipArrivalsWithoutNote: VipArrival[];
  /** Confirmed arrivals tomorrow with no arrival time on file. */
  unconfirmedEtasTomorrow: number;
}

interface ReservationRow {
  mews_id: string;
  state: string | null;
  start_utc: string | null;
  end_utc: string | null;
  customer_mews_id: string | null;
  arrival_time: string | null;
  raw: Json;
}

interface CustomerRow {
  mews_id: string;
  first_name: string | null;
  last_name: string | null;
  raw: Json;
}

function fullName(customer: CustomerRow | undefined): string | null {
  if (!customer) return null;
  const name = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || null;
}

/** The snapshot a hotel with nothing connected sees. */
function emptySnapshot(
  overrides: Partial<DashboardSnapshot> = {}
): DashboardSnapshot {
  const today = hotelToday("UTC");
  return {
    hotelName: "",
    timezone: "UTC",
    rooms: 0,
    today,
    connected: false,
    hasSyncedData: false,
    occupancyPct: 0,
    freeRooms: 0,
    checkinsToday: 0,
    checkoutsToday: 0,
    outlook: occupancyOutlook([], 0, today, OUTLOOK_DAYS),
    vipArrivalsWithoutNote: [],
    unconfirmedEtasTomorrow: 0,
    ...overrides,
  };
}

/**
 * Loads today's snapshot for the signed-in user's hotel.
 *
 * RLS already scopes every table to the caller's hotel; the explicit
 * `.eq("hotel_id", …)` on top is belt-and-braces, matching lib/inbox.ts.
 */
export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  const supabase = await createClient();

  const { data: hotel } = await supabase
    .from("hotels")
    .select("id, name, timezone, rooms_count, pms_connected, last_synced_at")
    .maybeSingle();

  if (!hotel) return emptySnapshot();

  const tz = hotel.timezone || "UTC";
  const rooms = hotel.rooms_count ?? 0;
  const today = hotelToday(tz);
  const tomorrow = addDays(today, 1);
  const base = {
    hotelName: hotel.name ?? "",
    timezone: tz,
    rooms,
    today,
    connected: hotel.pms_connected ?? false,
    hasSyncedData: Boolean(hotel.last_synced_at),
  };

  if (!base.connected) return emptySnapshot(base);

  // Any stay that could touch the window: it may have started well before
  // today and must simply not have ended yet.
  const windowStart = `${addDays(today, -UTC_PAD_DAYS)}T00:00:00Z`;
  const windowEnd = `${addDays(today, OUTLOOK_DAYS + UTC_PAD_DAYS)}T00:00:00Z`;

  // Paged: a busy fortnight easily exceeds PostgREST's 1,000-row cap, and a
  // truncated read would quietly report a half-empty hotel.
  const reservationRows = await fetchAllPages<ReservationRow>((from, to) =>
    supabase
      .from("reservations")
      .select(
        "mews_id, state, start_utc, end_utc, customer_mews_id, arrival_time, raw"
      )
      .eq("hotel_id", hotel.id)
      .lt("start_utc", windowEnd)
      .gt("end_utc", windowStart)
      // Unique within one hotel, so paging can't skip or repeat a row.
      .order("mews_id", { ascending: true })
      .range(from, to)
      .overrideTypes<ReservationRow[]>()
  );

  const reservations = reservationRows.filter(
    (r) => r.state !== CANCELLED_STATE && r.start_utc && r.end_utc
  );

  // Hotel-local dates are the unit of occupancy; do the precise filtering here
  // rather than in SQL, where the timezone isn't known.
  const dated = reservations.map((r) => ({
    reservation: r,
    arrival: localDateOf(tz, r.start_utc),
    departure: localDateOf(tz, r.end_utc),
  }));
  const stays: StayDates[] = dated.map(({ arrival, departure }) => ({
    arrival,
    departure,
  }));

  const occupiedTonight = occupiedOn(stays, today);

  // Guest profiles are only needed for today's arrivals (the VIP rule).
  const arrivingTodayIds = [
    ...new Set(
      dated
        .filter((d) => d.arrival === today)
        .map((d) => d.reservation.customer_mews_id)
        .filter(Boolean)
    ),
  ] as string[];

  let customerById = new Map<string, CustomerRow>();
  if (arrivingTodayIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("mews_id, first_name, last_name, raw")
      .eq("hotel_id", hotel.id)
      .in("mews_id", arrivingTodayIds);
    customerById = new Map(
      ((customers ?? []) as CustomerRow[]).map((c) => [c.mews_id, c])
    );
  }

  const vipArrivalsWithoutNote: VipArrival[] = dated
    .filter(({ reservation, arrival }) => {
      if (arrival !== today) return false;
      if (readNotes(reservation.raw)) return false; // the desk already has context
      const customer = reservation.customer_mews_id
        ? customerById.get(reservation.customer_mews_id)
        : undefined;
      return customer ? readVip(customer.raw) : false;
    })
    .map(({ reservation }) => ({
      reservationId: reservation.mews_id,
      name:
        fullName(
          reservation.customer_mews_id
            ? customerById.get(reservation.customer_mews_id)
            : undefined
        ) ?? "",
    }));

  const unconfirmedEtasTomorrow = dated.filter(
    ({ reservation, arrival }) =>
      arrival === tomorrow &&
      reservation.state === CONFIRMED_STATE &&
      !reservation.arrival_time
  ).length;

  return {
    ...base,
    occupancyPct: occupancyPct(occupiedTonight, rooms),
    freeRooms: Math.max(rooms - occupiedTonight, 0),
    checkinsToday: arrivalsOn(stays, today),
    checkoutsToday: departuresOn(stays, today),
    outlook: occupancyOutlook(stays, rooms, today, OUTLOOK_DAYS),
    vipArrivalsWithoutNote,
    unconfirmedEtasTomorrow,
  };
}
