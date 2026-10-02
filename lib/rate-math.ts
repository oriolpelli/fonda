/**
 * The rate cache's arithmetic (B17) — what a night sold for, what the hotel is
 * still selling it at, and what was booked since yesterday.
 *
 * Plain module: no I/O, no `server-only`, no React. The sync (lib/rate-sync.ts)
 * computes with it, the readers (lib/rate-outlook.ts) present with it, and the
 * fixture check (scripts/check-rate-math.ts) runs it without a database or a
 * PMS — the same arrangement as lib/occupancy.ts, whose rule it reuses so the
 * strip, the brief and the rates can never disagree about which nights a stay
 * sells.
 *
 * MONEY IS NET OF VAT (Oriol's call, 2 Oct). Both PMSs report net and gross
 * for every charge and price; we keep both and show net, which is the basis
 * every ADR report uses. Commission is not in these numbers either way: an
 * OTA invoices it afterwards, so a room charge is the hotel's full rate. The
 * one exception — merchant-model bookings that reach the PMS already net of
 * commission — cannot be told apart here and pulls the average down a little.
 *
 * NIGHTS ARE HOTEL-LOCAL DATES (YYYY-MM-DD), like everywhere else.
 */

import { addDays, coversNight, type StayDates } from "@/lib/occupancy";
import { localDate, localDateOf } from "@/lib/stay-phase";

/** Nights the cache covers: tonight and the next 13, the strip's fortnight. */
export const RATE_HORIZON_NIGHTS = 14;

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** One reservation's room charge for one night, as the PMS reports it. */
export interface NightCharge {
  reservationId: string;
  night: string;
  net: number;
  gross: number;
  currency: string | null;
}

/** The lowest public price on sale for one night. */
export interface NightPrice {
  night: string;
  net: number;
  gross: number;
  currency: string | null;
}

/** A stay reduced to what the rate cache needs: whose, and which nights. */
export interface RateStay extends StayDates {
  id: string;
}

/** One night of the live cache, before it is written (rate_nights). */
export interface RateNight {
  night: string;
  roomsSold: number;
  /** Null when the source has no charges at all — not the same as zero. */
  pricedRooms: number | null;
  revenueNet: number | null;
  revenueGross: number | null;
  currency: string | null;
}

/** One night of one snapshot (rate_snapshots). */
export interface SnapshotNight {
  as_of: string;
  night: string;
  rooms_sold: number;
  priced_rooms: number | null;
  revenue_net: number | null;
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/** Offset (local wall time − UTC) in ms for `tz` at `instant`. */
function tzOffsetMs(tz: string, instant: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - instant.getTime();
}

/**
 * The UTC instant of local midnight on `date` in `tz` — the start of that
 * night's time unit in a daily PMS service. Falls back to UTC midnight for an
 * invalid zone, like lib/stay-phase.ts does.
 */
export function zonedMidnightUtc(tz: string, date: string): Date {
  const naive = new Date(`${date}T00:00:00Z`);
  try {
    // Twice: the offset at the naive instant can differ from the offset at
    // the true midnight across a DST change.
    const first = new Date(naive.getTime() - tzOffsetMs(tz, naive));
    return new Date(naive.getTime() - tzOffsetMs(tz, first));
  } catch {
    return naive;
  }
}

/** `count` consecutive nights starting at `first`. */
export function nightsFrom(first: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(first, i));
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** English weekday name of a YYYY-MM-DD date — the form MEWS restrictions use. */
export function weekdayOf(date: string): (typeof WEEKDAYS)[number] {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// ---------------------------------------------------------------------------
// The live cache: rooms sold and what they pay, per night
// ---------------------------------------------------------------------------

/**
 * Rooms sold and room revenue for each night.
 *
 * `charges === null` means the source has no charges (the Sheet import): every
 * revenue field is null, and the strip says so rather than showing zero.
 *
 * A room counts towards the average only when its charges for that night sum
 * to more than zero, so a complimentary room or a stay whose charges haven't
 * been posted yet doesn't drag the average down — the industry definition of
 * ADR (room revenue ÷ paid rooms sold). Only stays that occupy the night count:
 * a charge on a cancelled stay, or for a night the stay doesn't cover, is
 * ignored. With more than one currency in play (it shouldn't happen in one
 * hotel) only the most common one is summed, so two currencies are never
 * added together.
 */
export function aggregateNights(
  nights: string[],
  stays: RateStay[],
  charges: NightCharge[] | null
): RateNight[] {
  // reservation → night → summed charge
  const perStayNight = new Map<
    string,
    { net: number; gross: number; currency: string | null }
  >();
  let currency: string | null = null;
  if (charges) {
    const counts = new Map<string, number>();
    for (const c of charges) {
      if (c.currency) counts.set(c.currency, (counts.get(c.currency) ?? 0) + 1);
    }
    currency =
      [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    for (const c of charges) {
      if (currency && c.currency && c.currency !== currency) continue;
      if (!finite(c.net) || !finite(c.gross)) continue;
      const key = `${c.reservationId}\u0000${c.night}`;
      const prev = perStayNight.get(key);
      perStayNight.set(key, {
        net: (prev?.net ?? 0) + c.net,
        gross: (prev?.gross ?? 0) + c.gross,
        currency: c.currency,
      });
    }
  }

  return nights.map((night) => {
    const covering = stays.filter((s) => coversNight(s, night));
    if (!charges) {
      return {
        night,
        roomsSold: covering.length,
        pricedRooms: null,
        revenueNet: null,
        revenueGross: null,
        currency: null,
      };
    }
    let pricedRooms = 0;
    let revenueNet = 0;
    let revenueGross = 0;
    for (const stay of covering) {
      const charge = perStayNight.get(`${stay.id}\u0000${night}`);
      if (!charge || charge.net <= 0) continue;
      pricedRooms++;
      revenueNet += charge.net;
      revenueGross += charge.gross;
    }
    return {
      night,
      roomsSold: covering.length,
      pricedRooms,
      revenueNet: round2(revenueNet),
      revenueGross: round2(revenueGross),
      currency,
    };
  });
}

/** Average daily rate: room revenue ÷ paid rooms, or null with none. */
export function adrOf(
  revenueNet: number | null | undefined,
  pricedRooms: number | null | undefined
): number | null {
  if (!finite(revenueNet) || !finite(pricedRooms) || pricedRooms <= 0) {
    return null;
  }
  return round2(revenueNet / pricedRooms);
}

// ---------------------------------------------------------------------------
// MEWS
// ---------------------------------------------------------------------------

/** The parts of a MEWS order item the cache reads. */
export interface MewsOrderItemLite {
  ServiceOrderId?: string | null;
  Type?: string | null;
  AccountingState?: string | null;
  ConsumedUtc?: string | null;
  Amount?: {
    Currency?: string | null;
    NetValue?: number | null;
    GrossValue?: number | null;
  } | null;
}

/**
 * Room charges from MEWS order items. A night's room revenue is its
 * `SpaceOrder` item plus any `NightRebate` against it (a rebate is negative).
 * Only effective items count: `Open` (not yet on a bill) and `Closed` (on a
 * bill). `Inactive` items are zero-value or voided, `Canceled` ones are gone.
 * The item's `ConsumedUtc` is the start of its night's time unit, so its local
 * date is the night.
 */
export function mewsNightCharges(
  items: MewsOrderItemLite[],
  tz: string
): NightCharge[] {
  const out: NightCharge[] = [];
  for (const item of items) {
    if (item.Type !== "SpaceOrder" && item.Type !== "NightRebate") continue;
    if (item.AccountingState !== "Open" && item.AccountingState !== "Closed") {
      continue;
    }
    const night = localDateOf(tz, item.ConsumedUtc ?? null);
    const net = item.Amount?.NetValue;
    const gross = item.Amount?.GrossValue;
    if (!item.ServiceOrderId || !night || !finite(net) || !finite(gross)) {
      continue;
    }
    out.push({
      reservationId: item.ServiceOrderId,
      night,
      net,
      gross,
      currency: item.Amount?.Currency ?? null,
    });
  }
  return out;
}

/** The parts of a MEWS rate the selling price reads. */
export interface MewsRateLite {
  Id: string;
  GroupId?: string | null;
  BaseRateId?: string | null;
  ServiceId?: string | null;
  IsActive?: boolean | null;
  IsEnabled?: boolean | null;
  IsPublic?: boolean | null;
  Type?: string | null;
}

/**
 * A rate a member of the public can book: active, enabled, and public. MEWS
 * marks this twice (`IsPublic`, `Type: "Public"`); either is enough, and a
 * `Private` rate (corporate, negotiated) or an `AvailabilityBlock` rate
 * (groups, allotments) is never a public price. Derived rates count — a
 * non-refundable rate at BAR −10% is very often the lowest public price.
 */
export function isPublicSellableRate(rate: MewsRateLite): boolean {
  if (rate.IsActive === false || rate.IsEnabled === false) return false;
  if (rate.Type === "AvailabilityBlock" || rate.Type === "Private") return false;
  return rate.IsPublic === true || rate.Type === "Public";
}

/** MEWS restriction, the parts that decide whether a night is closed. */
export interface MewsRestrictionLite {
  Conditions?: {
    Type?: string | null;
    ExactRateId?: string | null;
    BaseRateId?: string | null;
    RateGroupId?: string | null;
    ResourceCategoryId?: string | null;
    StartUtc?: string | null;
    EndUtc?: string | null;
    /** `["Saturday", "Sunday"]` — or, from older versions, `{ Saturday: true }`. */
    Days?: string[] | Record<string, boolean> | null;
  } | null;
  Exceptions?: Record<string, unknown> | null;
}

function appliesOnDay(
  days: string[] | Record<string, boolean> | null | undefined,
  weekday: string
): boolean {
  if (!days) return true;
  if (Array.isArray(days)) return days.length === 0 || days.includes(weekday);
  const listed = Object.entries(days).filter(([, on]) => on);
  return listed.length === 0 || days[weekday] === true;
}

/**
 * Whether a restriction closes `rate` in `categoryId` on the night starting at
 * `nightStartUtc`.
 *
 * Only a `Stay` restriction with NO exceptions closes a night outright. One
 * with exceptions (a minimum stay, a price floor, an advance window) still
 * lets some stays through, so the night is still on sale and its price is
 * still the price. `Start`/`End` restrictions (closed to arrival/departure)
 * don't take a night off sale either. The interval is read as running from
 * the first time unit's start to the last time unit's start, inclusive — how
 * MEWS describes its intervals.
 */
export function restrictionCloses(
  restriction: MewsRestrictionLite,
  rate: MewsRateLite,
  categoryId: string,
  nightStartUtc: Date,
  weekday: string
): boolean {
  const c = restriction.Conditions;
  if (!c || c.Type !== "Stay") return false;
  const exceptions = restriction.Exceptions ?? {};
  if (Object.values(exceptions).some((v) => v !== null && v !== undefined)) {
    return false;
  }
  if (c.ExactRateId && c.ExactRateId !== rate.Id) return false;
  if (
    c.BaseRateId &&
    c.BaseRateId !== rate.Id &&
    c.BaseRateId !== rate.BaseRateId
  ) {
    return false;
  }
  if (c.RateGroupId && c.RateGroupId !== rate.GroupId) return false;
  if (c.ResourceCategoryId && c.ResourceCategoryId !== categoryId) return false;
  const t = nightStartUtc.getTime();
  if (c.StartUtc && t < new Date(c.StartUtc).getTime()) return false;
  if (c.EndUtc && t > new Date(c.EndUtc).getTime()) return false;
  return appliesOnDay(c.Days, weekday);
}

/** One rate's prices, as rates/getPricing returns them. */
export interface MewsPricingLite {
  rateId: string;
  TimeUnitStartsUtc?: string[] | null;
  CategoryPrices?: {
    CategoryId: string;
    AmountPrices?: ({
      Currency?: string | null;
      NetValue?: number | null;
      GrossValue?: number | null;
    } | null)[] | null;
  }[] | null;
}

/** One service's availability, as services/getAvailability/2024-01-22 returns it. */
export interface MewsAvailabilityLite {
  TimeUnitStartsUtc?: string[] | null;
  ResourceCategoryAvailabilities?: {
    ResourceCategoryId: string;
    Metrics?: Record<string, (number | null)[] | null | undefined> | null;
  }[] | null;
}

/** The availability metrics the selling price asks MEWS for. */
export const MEWS_AVAILABILITY_METRICS = [
  "UsableResources",
  "Occupied",
  "OtherServiceReservationCount",
  "PublicAvailabilityAdjustment",
] as const;

/**
 * Rooms left to sell per category per night: usable rooms (active, not out of
 * order) minus those occupied by reservations and blocks, minus those taken by
 * another service, plus the manual availability adjustment (negative when the
 * hotel holds rooms back). A night whose numbers are missing is left out —
 * unknown is not "available".
 */
export function mewsRoomsLeft(
  availability: MewsAvailabilityLite[],
  tz: string
): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const service of availability) {
    const starts = service.TimeUnitStartsUtc ?? [];
    for (const cat of service.ResourceCategoryAvailabilities ?? []) {
      const m = cat.Metrics ?? {};
      const byNight = out.get(cat.ResourceCategoryId) ?? new Map<string, number>();
      starts.forEach((start, i) => {
        const usable = m.UsableResources?.[i];
        const occupied = m.Occupied?.[i];
        if (!finite(usable) || !finite(occupied)) return;
        const other = m.OtherServiceReservationCount?.[i];
        const adjustment = m.PublicAvailabilityAdjustment?.[i];
        const left =
          usable -
          occupied -
          (finite(other) ? other : 0) +
          (finite(adjustment) ? adjustment : 0);
        const night = localDateOf(tz, start);
        if (night) byNight.set(night, left);
      });
      out.set(cat.ResourceCategoryId, byNight);
    }
  }
  return out;
}

/**
 * The lowest public price on sale each night, from MEWS: across every public
 * rate and every room type, the cheapest price whose room type still has a
 * room left that night and whose rate isn't closed for it. A night with no
 * such price is left out — "nothing open" is reported as nothing, never as a
 * price nobody can book.
 */
export function mewsCheapestByNight(input: {
  tz: string;
  nights: string[];
  rates: MewsRateLite[];
  pricing: MewsPricingLite[];
  restrictions: MewsRestrictionLite[];
  availability: MewsAvailabilityLite[];
}): NightPrice[] {
  const { tz, nights } = input;
  const wanted = new Set(nights);
  const rateById = new Map(input.rates.map((r) => [r.Id, r]));
  const roomsLeft = mewsRoomsLeft(input.availability, tz);
  const best = new Map<string, NightPrice>();

  for (const p of input.pricing) {
    const rate = rateById.get(p.rateId);
    if (!rate || !isPublicSellableRate(rate)) continue;
    const starts = p.TimeUnitStartsUtc ?? [];
    for (const cat of p.CategoryPrices ?? []) {
      starts.forEach((start, i) => {
        const night = localDateOf(tz, start);
        if (!night || !wanted.has(night)) return;
        const price = cat.AmountPrices?.[i];
        const net = price?.NetValue;
        const gross = price?.GrossValue;
        if (!finite(net) || !finite(gross) || net <= 0) return;
        const left = roomsLeft.get(cat.CategoryId)?.get(night);
        if (!finite(left) || left <= 0) return;
        const startDate = new Date(start);
        const weekday = weekdayOf(night);
        if (
          input.restrictions.some((r) =>
            restrictionCloses(r, rate, cat.CategoryId, startDate, weekday)
          )
        ) {
          return;
        }
        const current = best.get(night);
        if (!current || net < current.net) {
          best.set(night, {
            night,
            net: round2(net),
            gross: round2(gross),
            currency: price?.Currency ?? null,
          });
        }
      });
    }
  }
  return nights.flatMap((n) => (best.has(n) ? [best.get(n)!] : []));
}

// ---------------------------------------------------------------------------
// Apaleo
// ---------------------------------------------------------------------------

/** Apaleo's amount model: gross and net, with the VAT that separates them. */
export interface ApaleoAmountLite {
  grossAmount?: number | null;
  netAmount?: number | null;
  currency?: string | null;
}

/** An Apaleo reservation with its time slices (`expand=timeSlices`). */
export interface ApaleoReservationSlicesLite {
  id: string;
  status?: string | null;
  timeSlices?: {
    from?: string | null;
    serviceDate?: string | null;
    baseAmount?: ApaleoAmountLite | null;
  }[] | null;
}

/**
 * Room charges from Apaleo time slices. A slice is one night; its
 * `baseAmount` is the room price for it, without the services the rate
 * includes (breakfast, parking). `serviceDate` is the hotel-local night; when
 * absent, the slice's start is converted. Cancelled stays and no-shows carry
 * no room revenue.
 */
export function apaleoNightCharges(
  reservations: ApaleoReservationSlicesLite[],
  tz: string
): NightCharge[] {
  const out: NightCharge[] = [];
  for (const r of reservations) {
    if (r.status === "Canceled" || r.status === "NoShow") continue;
    for (const slice of r.timeSlices ?? []) {
      const night = slice.serviceDate?.slice(0, 10) || localDateOf(tz, slice.from ?? null);
      const net = slice.baseAmount?.netAmount;
      const gross = slice.baseAmount?.grossAmount;
      if (!night || !finite(net) || !finite(gross)) continue;
      out.push({
        reservationId: r.id,
        night,
        net,
        gross,
        currency: slice.baseAmount?.currency ?? null,
      });
    }
  }
  return out;
}

/** An Apaleo offer, the parts the selling price reads. */
export interface ApaleoOfferLite {
  availableUnits?: number | null;
  timeSlices?: { baseAmount?: ApaleoAmountLite | null }[] | null;
}

/**
 * The cheapest offer for a one-night stay. Apaleo's offers already apply the
 * hotel's restrictions and only include rate plans sold on the channel asked
 * for; an offer with no units left is skipped. Priced from the night's
 * `baseAmount`, so it compares with the average rate on the same basis (room
 * only, excl. VAT).
 */
export function apaleoCheapestOffer(
  night: string,
  offers: ApaleoOfferLite[]
): NightPrice | null {
  let best: NightPrice | null = null;
  for (const offer of offers) {
    if (finite(offer.availableUnits) && offer.availableUnits <= 0) continue;
    const amount = offer.timeSlices?.[0]?.baseAmount;
    const net = amount?.netAmount;
    const gross = amount?.grossAmount;
    if (!finite(net) || !finite(gross) || net <= 0) continue;
    if (!best || net < best.net) {
      best = {
        night,
        net: round2(net),
        gross: round2(gross),
        currency: amount?.currency ?? null,
      };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Pickup
// ---------------------------------------------------------------------------

/**
 * Rooms picked up per night between two snapshots: later minus earlier, for
 * every night both cover. Net of cancellations, so it can be negative. A night
 * only one of them covers is left out rather than counted from zero.
 */
export function pickupBetween(
  later: SnapshotNight[],
  earlier: SnapshotNight[]
): Map<string, number> {
  const before = new Map(earlier.map((s) => [s.night, s.rooms_sold]));
  const out = new Map<string, number>();
  for (const s of later) {
    const prev = before.get(s.night);
    if (prev === undefined) continue;
    out.set(s.night, s.rooms_sold - prev);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The outlook the readers present (brief, Ask, Home)
// ---------------------------------------------------------------------------

/** One stored night, as the readers select it from rate_nights. */
export interface StoredRateNight {
  night: string;
  rooms_sold: number;
  priced_rooms: number | null;
  revenue_net: number | null;
  sell_from_net: number | null;
  sell_from_checked_at: string | null;
  currency: string | null;
}

export interface RateOutlookNight {
  date: string;
  roomsSold: number;
  /** Average rate of the rooms already sold, excl. VAT. Null: none priced. */
  adr: number | null;
  /** Lowest public price on sale, excl. VAT. Null: nothing open, or unknown. */
  sellFrom: number | null;
  /** Rooms booked yesterday for this night, net of cancellations. */
  pickupYesterday: number | null;
  /** The same over the last seven days. */
  pickupWeek: number | null;
}

export interface RateOutlook {
  currency: string | null;
  /** The source reports room charges (not the Sheet import). */
  hasRevenue: boolean;
  /** The selling price has been checked at least once. */
  hasSellingPrice: boolean;
  /**
   * Rooms booked yesterday across every night both snapshots cover, net of
   * cancellations. Null until there are two days of snapshots.
   */
  pickupYesterdayTotal: number | null;
  nights: RateOutlookNight[];
}

function n(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const v = Number(value);
  return Number.isFinite(v) ? v : null;
}

/**
 * Turns the stored cache and the day snapshots into what a reader shows.
 * Pickup "yesterday" is today's snapshot (taken just after midnight) minus
 * yesterday's: the bookings made during the whole of yesterday, the way a
 * revenue report counts a day's pickup. Null when the cache is empty.
 */
export function buildRateOutlook(input: {
  today: string;
  rows: StoredRateNight[];
  snapshots: SnapshotNight[];
}): RateOutlook | null {
  const { today } = input;
  if (input.rows.length === 0) return null;

  const nights = nightsFrom(today, RATE_HORIZON_NIGHTS);
  const byNight = new Map(input.rows.map((r) => [r.night.slice(0, 10), r]));
  const snaps = (asOf: string) =>
    input.snapshots
      .filter((s) => s.as_of.slice(0, 10) === asOf)
      .map((s) => ({ ...s, night: s.night.slice(0, 10), rooms_sold: Number(s.rooms_sold) }));
  const todaySnap = snaps(today);
  const yesterday = pickupBetween(todaySnap, snaps(addDays(today, -1)));
  const week = pickupBetween(todaySnap, snaps(addDays(today, -7)));

  const currencyCounts = new Map<string, number>();
  for (const r of input.rows) {
    if (r.currency) currencyCounts.set(r.currency, (currencyCounts.get(r.currency) ?? 0) + 1);
  }

  return {
    currency:
      [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    hasRevenue: input.rows.some((r) => r.priced_rooms !== null),
    hasSellingPrice: input.rows.some((r) => r.sell_from_checked_at !== null),
    pickupYesterdayTotal:
      yesterday.size > 0 ? [...yesterday.values()].reduce((a, b) => a + b, 0) : null,
    nights: nights.map((date) => {
      const row = byNight.get(date);
      return {
        date,
        roomsSold: n(row?.rooms_sold) ?? 0,
        adr: adrOf(n(row?.revenue_net), n(row?.priced_rooms)),
        sellFrom: n(row?.sell_from_net),
        pickupYesterday: yesterday.get(date) ?? null,
        pickupWeek: week.get(date) ?? null,
      };
    }),
  };
}

/**
 * Runs `work` over `items`, at most `limit` at a time; results in input order.
 * For the PMS calls that go one per rate or one per night.
 */
export async function mapLimited<T, R>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const i = next++;
      results[i] = await work(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, lane)
  );
  return results;
}

/** Today in `tz` — re-exported so the sync and readers share one source. */
export function todayIn(tz: string, now: Date = new Date()): string {
  return localDate(tz, now);
}
