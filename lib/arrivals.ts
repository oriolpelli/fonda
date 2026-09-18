import "server-only";

import { addDays } from "@/lib/occupancy";
import { readEta, readRoom, readRoomType } from "@/lib/pms-fields";
import { hotelToday, localDateOf } from "@/lib/stay-phase";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/paged";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/**
 * Who is arriving and who is leaving today (APP_UX_PROPOSAL.md §3.3).
 *
 * `checkinsToday` / `checkoutsToday` have been numbers in the stat row since
 * the first dashboard, with nothing behind them. This is the list: the same two
 * movements as names, so check-out becomes something a GM can act on rather
 * than a digit.
 *
 * A sibling of lib/dashboard-snapshot.ts rather than a part of it. The snapshot
 * reads a fortnight of reservations to derive occupancy; this reads one day to
 * list people, needs the guest profiles for *both* ends of the day (the
 * snapshot only fetches today's arrivals), and answers a question the snapshot
 * never asks — has this guest stayed before. Two reads, deliberately: a home
 * widget that fails must degrade to its own empty state, and folding this into
 * the snapshot would let one broken query blank the whole page.
 *
 * Read through the RLS-scoped server client, like every other dashboard read
 * model. Nothing is stored: "today" is only true for a day.
 */

/** MEWS reservation state we treat as no booking at all. */
const CANCELLED_STATE = "Canceled";

/**
 * How far either side of today to reach in UTC before filtering on hotel-local
 * dates. One day absorbs any timezone offset (UTC−12 … UTC+14).
 */
const UTC_PAD_DAYS = 1;

export interface Arrival {
  reservationId: string;
  /** Display name. Null when the booking carries no guest profile. */
  name: string | null;
  /** Room type as a GM would say it, or null when the PMS only gave an id. */
  roomType: string | null;
  /** Expected arrival time, free text as the PMS holds it. Null = no ETA. */
  eta: string | null;
  /** This guest has stayed before — a prior reservation exists. */
  returning: boolean;
  /** Check-in instant, ISO-8601 UTC. Sort key for equal ETAs. */
  startUtc: string;
}

export interface Departure {
  reservationId: string;
  name: string | null;
  /** Assigned room, or null when the PMS only gave an id. */
  room: string | null;
  /** Check-out instant, ISO-8601 UTC; the widget prints the hotel wall clock. */
  endUtc: string;
}

export interface TodayMovements {
  /** The hotel's timezone — the widgets print times in it. */
  timezone: string;
  arrivals: Arrival[];
  departures: Departure[];
}

/** The reservation columns these two lists are built from. */
export interface MovementRow {
  mews_id: string;
  state: string | null;
  start_utc: string | null;
  end_utc: string | null;
  customer_mews_id: string | null;
  requested_category_id: string | null;
  assigned_space_id: string | null;
  arrival_time: string | null;
  raw: Json;
}

/** The guest columns behind a row's display name. */
export interface MovementGuest {
  mews_id: string;
  first_name: string | null;
  last_name: string | null;
}

const COLUMNS =
  "mews_id, state, start_utc, end_utc, customer_mews_id, requested_category_id, assigned_space_id, arrival_time, raw";

function fullName(customer: MovementGuest | undefined): string | null {
  if (!customer) return null;
  const name = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || null;
}

/**
 * Sorts an ETA the way the desk reads the day: real clock times in order, then
 * everything vaguer ("late afternoon"), then the guests who never said.
 *
 * Three explicit tiers rather than one cleverly-prefixed string — a sentinel
 * character only works under code-point ordering, and `localeCompare` sorts
 * symbols *before* digits, which silently put every unknown ETA at the top of
 * the card.
 */
function etaOrder(eta: string | null): { tier: number; key: string } {
  if (!eta) return { tier: 2, key: "" };
  const clock = /^(\d{1,2}):(\d{2})/.exec(eta.trim());
  if (clock) {
    return { tier: 0, key: `${clock[1].padStart(2, "0")}:${clock[2]}` };
  }
  return { tier: 1, key: eta.trim() };
}

/** Compares two ETAs by tier, then within the tier. */
function byEta(a: string | null, b: string | null): number {
  const left = etaOrder(a);
  const right = etaOrder(b);
  return left.tier - right.tier || left.key.localeCompare(right.key);
}

/** Names sort together whatever the locale — this is a tiebreak, not a listing. */
function byNameThen(a: Arrival | Departure, b: Arrival | Departure): number {
  return (a.name ?? "").localeCompare(b.name ?? "");
}

const EMPTY: TodayMovements = { timezone: "UTC", arrivals: [], departures: [] };

/**
 * Today's arrivals and departures for the signed-in user's hotel, in the
 * hotel's timezone.
 *
 * Both lists come back whole, uncapped: the widgets decide how many rows they
 * show, and they need the total to say "+N more".
 */
export async function loadTodayMovements(): Promise<TodayMovements> {
  const supabase = await createClient();

  const { data: hotel } = await supabase
    .from("hotels")
    .select("id, timezone, pms_connected")
    .maybeSingle();

  if (!hotel) return EMPTY;
  const tz = hotel.timezone || "UTC";
  if (!hotel.pms_connected) return { ...EMPTY, timezone: tz };

  const today = hotelToday(tz);
  const from = `${addDays(today, -UTC_PAD_DAYS)}T00:00:00Z`;
  const to = `${addDays(today, 1 + UTC_PAD_DAYS)}T00:00:00Z`;

  // Two narrow queries rather than one `.or()`: each hits its own index, and a
  // day's movements are a few hundred rows at most. Paged anyway, because
  // PostgREST truncates at 1,000 silently and a half-listed arrivals board is
  // worse than none (lib/supabase/paged.ts).
  const [arrivalRows, departureRows] = await Promise.all([
    fetchAllPages<MovementRow>((start, end) =>
      supabase
        .from("reservations")
        .select(COLUMNS)
        .eq("hotel_id", hotel.id)
        .gte("start_utc", from)
        .lt("start_utc", to)
        // Unique within one hotel, so paging can't skip or repeat a row.
        .order("mews_id", { ascending: true })
        .range(start, end)
        .overrideTypes<MovementRow[]>()
    ),
    fetchAllPages<MovementRow>((start, end) =>
      supabase
        .from("reservations")
        .select(COLUMNS)
        .eq("hotel_id", hotel.id)
        .gte("end_utc", from)
        .lt("end_utc", to)
        .order("mews_id", { ascending: true })
        .range(start, end)
        .overrideTypes<MovementRow[]>()
    ),
  ]);

  const arriving = movingToday(arrivalRows, tz, today, "arrival");
  const leaving = movingToday(departureRows, tz, today, "departure");

  const guestIds = (rows: MovementRow[]) =>
    [...new Set(rows.map((r) => r.customer_mews_id).filter(Boolean))] as string[];

  const [customers, returningGuestIds] = await Promise.all([
    loadCustomers(supabase, hotel.id, guestIds([...arriving, ...leaving])),
    loadReturningGuests(supabase, hotel.id, guestIds(arriving), from),
  ]);

  return buildMovements({
    timezone: tz,
    arriving,
    leaving,
    customers,
    returningGuestIds,
  });
}

/**
 * The reservations whose hotel-local arrival (or departure) date is `today`,
 * cancellations dropped.
 *
 * The UTC window the query uses is deliberately loose — hotel-local dates are
 * the unit a GM means by "today", and SQL doesn't know the hotel's timezone —
 * so this is where "today" actually gets decided. Pure, and exported with
 * `buildMovements` below so the rule can be exercised against a real database
 * without a request context.
 */
export function movingToday(
  rows: MovementRow[],
  timezone: string,
  today: string,
  edge: "arrival" | "departure"
): MovementRow[] {
  return rows.filter((r) => {
    if (r.state === CANCELLED_STATE) return false;
    const at = edge === "arrival" ? r.start_utc : r.end_utc;
    return Boolean(at) && localDateOf(timezone, at) === today;
  });
}

/** Rows in, the two widget lists out. Pure — see `movingToday`. */
export function buildMovements({
  timezone,
  arriving,
  leaving,
  customers,
  returningGuestIds,
}: {
  timezone: string;
  arriving: MovementRow[];
  leaving: MovementRow[];
  customers: Map<string, MovementGuest>;
  returningGuestIds: Set<string>;
}): TodayMovements {
  const nameOf = (id: string | null) =>
    fullName(id ? customers.get(id) : undefined);

  const arrivals: Arrival[] = arriving
    .map((r) => ({
      reservationId: r.mews_id,
      name: nameOf(r.customer_mews_id),
      roomType: readRoomType(r.raw, r.requested_category_id),
      // The captured ETA wins over whatever the booking shipped with: it is
      // the guest's own answer to the chaser (lib/checkin-chaser.ts).
      eta: r.arrival_time?.trim() || readEta(r.raw),
      returning: Boolean(
        r.customer_mews_id && returningGuestIds.has(r.customer_mews_id)
      ),
      startUtc: r.start_utc as string,
    }))
    .sort((a, b) => byEta(a.eta, b.eta) || byNameThen(a, b));

  const departures: Departure[] = leaving
    .map((r) => ({
      reservationId: r.mews_id,
      name: nameOf(r.customer_mews_id),
      room: readRoom(r.raw, r.assigned_space_id),
      endUtc: r.end_utc as string,
    }))
    .sort((a, b) => a.endUtc.localeCompare(b.endUtc) || byNameThen(a, b));

  return { timezone, arrivals, departures };
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function loadCustomers(
  supabase: ServerClient,
  hotelId: string,
  ids: string[]
): Promise<Map<string, MovementGuest>> {
  if (ids.length === 0) return new Map();
  const rows = await fetchInChunks<MovementGuest>(ids, (chunk) =>
    supabase
      .from("customers")
      .select("mews_id, first_name, last_name")
      .eq("hotel_id", hotelId)
      .in("mews_id", chunk)
      .overrideTypes<MovementGuest[]>()
  );
  return new Map(rows.map((c) => [c.mews_id, c]));
}

/**
 * Which of today's arriving guests have stayed here before.
 *
 * "Before" means a reservation that started before today's UTC window — a
 * second booking starting today is a room move, not a previous stay — and one
 * that wasn't cancelled: a booking they never turned up for is not a visit.
 * Only the existence matters, so the rows are counted, never read.
 */
async function loadReturningGuests(
  supabase: ServerClient,
  hotelId: string,
  guestIds: string[],
  before: string
): Promise<Set<string>> {
  if (guestIds.length === 0) return new Set();

  const rows = await fetchInChunks<{
    customer_mews_id: string | null;
    state: string | null;
  }>(guestIds, (chunk) =>
    supabase
      .from("reservations")
      .select("customer_mews_id, state")
      .eq("hotel_id", hotelId)
      .in("customer_mews_id", chunk)
      .lt("start_utc", before)
      .overrideTypes<{ customer_mews_id: string | null; state: string | null }[]>()
  );

  return new Set(
    rows
      .filter((r) => r.state !== CANCELLED_STATE && r.customer_mews_id)
      .map((r) => r.customer_mews_id as string)
  );
}
