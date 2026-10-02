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

/**
 * One night's selling-price check. `price: null` means the PMS answered and
 * nothing is on sale that night (sold out, or every public rate closed). A
 * night the PMS couldn't answer for is left out of the result altogether —
 * "we couldn't tell" is never stored as "nothing on sale".
 */
export interface NightPriceResult {
  night: string;
  price: NightPrice | null;
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
  /** When the snapshot was taken; pickup checks the gap between two. */
  taken_at?: string | null;
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
  Exceptions?: {
    MinAdvance?: string | null;
    MaxAdvance?: string | null;
    MinLength?: string | null;
    MaxLength?: string | null;
    MinPrice?: { Value?: number | null } | null;
    MaxPrice?: { Value?: number | null } | null;
  } | null;
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

const DURATION =
  /^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

/**
 * An ISO 8601 duration ("P0M21DT0H0M0S") in milliseconds, or null if it
 * doesn't parse. Months count as 30 days and years as 365 — MEWS uses these
 * for advance windows, where a day either way doesn't change the answer.
 */
export function durationMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = DURATION.exec(value.trim());
  if (!m) return null;
  const [y, mo, w, d, h, mi, sec] = m.slice(1).map((x) => (x ? Number(x) : 0));
  const days = y * 365 + mo * 30 + w * 7 + d;
  return ((days * 24 + h) * 60 + mi) * 60_000 + sec * 1000;
}

/**
 * Whether a restriction closes `rate` in `categoryId` for a guest who books
 * NOW to arrive on the night starting at `nightStartUtc` — the definition of
 * "on sale" the selling price uses for both PMSs.
 *
 * `Stay` restrictions (can't stay) and `Start` restrictions (can't arrive)
 * both matter for that guest; `End` doesn't, since they can leave another
 * day. A restriction's exceptions are the bookings it lets through (MEWS:
 * "rules that prevent the restriction from applying"), so with exceptions it
 * still closes the night unless this booking meets them:
 *   - MinAdvance / MaxAdvance: tested against the time from now to arrival.
 *     An early-booker rate (MinAdvance 21 days) is closed for the next
 *     fortnight, which is exactly what a guest booking today sees.
 *   - MinLength / MaxLength: the guest can choose how long to stay, so a
 *     minimum stay doesn't take the night off sale (Apaleo is asked the same
 *     way: lib/apaleo.ts tries a longer stay when one night returns nothing).
 *   - MinPrice / MaxPrice: tested against the candidate price, gross.
 * The interval runs from the first time unit's start to the last time unit's
 * start, inclusive — how MEWS describes its intervals.
 */
export function restrictionCloses(
  restriction: MewsRestrictionLite,
  rate: MewsRateLite,
  categoryId: string,
  nightStartUtc: Date,
  weekday: string,
  booking: { now: Date; priceGross: number }
): boolean {
  const c = restriction.Conditions;
  if (!c || (c.Type !== "Stay" && c.Type !== "Start")) return false;
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
  if (!appliesOnDay(c.Days, weekday)) return false;

  // The conditions match. Does this booking meet every exception?
  const e = restriction.Exceptions;
  if (!e) return true;
  const advance = t - booking.now.getTime();
  const minAdvance = durationMs(e.MinAdvance);
  const maxAdvance = durationMs(e.MaxAdvance);
  const minPrice = e.MinPrice?.Value;
  const maxPrice = e.MaxPrice?.Value;
  const hasException =
    minAdvance !== null ||
    maxAdvance !== null ||
    finite(minPrice) ||
    finite(maxPrice) ||
    durationMs(e.MinLength) !== null ||
    durationMs(e.MaxLength) !== null;
  if (!hasException) return true;
  if (minAdvance !== null && advance < minAdvance) return true;
  if (maxAdvance !== null && advance > maxAdvance) return true;
  if (finite(minPrice) && booking.priceGross < minPrice) return true;
  if (finite(maxPrice) && booking.priceGross > maxPrice) return true;
  return false;
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
  "HouseUse",
  "PublicAvailabilityAdjustment",
] as const;

/**
 * Rooms left to sell per category per night: usable rooms (active, not out of
 * order) minus those occupied by reservations and blocks, minus those taken by
 * another service or kept for house use, plus the manual availability
 * adjustment (negative when the hotel holds rooms back) — the arithmetic of
 * MEWS's own availability report. A night whose numbers are missing is left
 * out: unknown is not "available".
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
        const houseUse = m.HouseUse?.[i];
        const adjustment = m.PublicAvailabilityAdjustment?.[i];
        const left =
          usable -
          occupied -
          (finite(other) ? other : 0) -
          (finite(houseUse) ? houseUse : 0) +
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
 * The lowest public price on sale each night, from MEWS, for a guest booking
 * now to arrive that night: across every public rate and every room type, the
 * cheapest price whose room type still has a room left and whose rate no
 * restriction closes.
 *
 * Each night ends up one of three ways. A price: on sale. `price: null`: the
 * PMS priced that night and every candidate was sold out or closed — nothing
 * on sale. Left out: no candidate could be judged (no prices, or the
 * availability numbers were missing) — unknown, which the sync stores as
 * "keep what we had", never as "nothing on sale".
 */
export function mewsCheapestByNight(input: {
  tz: string;
  nights: string[];
  rates: MewsRateLite[];
  pricing: MewsPricingLite[];
  restrictions: MewsRestrictionLite[];
  availability: MewsAvailabilityLite[];
  now: Date;
}): NightPriceResult[] {
  const { tz, nights, now } = input;
  const wanted = new Set(nights);
  const rateById = new Map(input.rates.map((r) => [r.Id, r]));
  const roomsLeft = mewsRoomsLeft(input.availability, tz);
  const best = new Map<string, NightPrice>();
  const judged = new Set<string>(); // nights with at least one decided candidate
  const unsure = new Set<string>(); // nights with a candidate we couldn't judge

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
        if (!finite(left)) {
          unsure.add(night);
          return;
        }
        judged.add(night);
        if (left <= 0) return;
        const startDate = new Date(start);
        const weekday = weekdayOf(night);
        if (
          input.restrictions.some((r) =>
            restrictionCloses(r, rate, cat.CategoryId, startDate, weekday, {
              now,
              priceGross: gross,
            })
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
  return nights.flatMap((night): NightPriceResult[] => {
    const price = best.get(night);
    if (price) return [{ night, price }];
    // Nothing on sale only when every candidate was judged; one we couldn't
    // judge might have been the open one.
    if (judged.has(night) && !unsure.has(night)) return [{ night, price: null }];
    return [];
  });
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
// What a sync run writes (lib/rate-sync.ts) — pure, so it can be checked
// ---------------------------------------------------------------------------

/** A stored rate_nights row, as the sync reads it back. */
export interface StoredNightFull {
  night: string;
  rooms_sold: number;
  priced_rooms: number | null;
  revenue_net: number | null;
  revenue_gross: number | null;
  sell_from_net: number | null;
  sell_from_gross: number | null;
  sell_from_checked_at: string | null;
  sell_from_attempted_at: string | null;
  currency: string | null;
}

/** One rate_nights upsert row. Optional keys are the ones a run may skip. */
export interface RateNightWrite {
  hotel_id: string;
  night: string;
  rooms_sold: number;
  updated_at: string;
  priced_rooms?: number | null;
  revenue_net?: number | null;
  revenue_gross?: number | null;
  sell_from_net?: number | null;
  sell_from_gross?: number | null;
  sell_from_checked_at?: string | null;
  sell_from_attempted_at?: string | null;
  currency?: string | null;
}

/** Postgres numeric comes back as a number from PostgREST; normalise anyway. */
function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const v = Number(value);
  return Number.isFinite(v) ? v : null;
}

/**
 * The rows a sync run upserts into rate_nights — only the nights whose
 * numbers changed.
 *
 *   charges  NightCharge[] → revenue written; null → the source has none
 *            (written as null, "no rates"); undefined → the call failed
 *            (revenue columns left as they are)
 *   prices   NightPriceResult[] → answered: a night in it gets its price (or
 *            "nothing on sale"); a night missing from it keeps its stored
 *            price and check time. null → the source has no selling prices
 *            (price columns never touched). undefined → not asked this run,
 *            or the call failed
 *   attempted  prices were asked for this run (whatever came back): the
 *            attempt time moves on every row — the hourly back-off
 *
 * Every row carries the same columns: PostgREST's bulk upsert nulls a column
 * one row leaves out, which would silently erase stored numbers.
 */
export function planRateWrites(input: {
  hotelId: string;
  aggregated: RateNight[];
  stored: Map<string, StoredNightFull>;
  charges: NightCharge[] | null | undefined;
  prices: NightPriceResult[] | null | undefined;
  attempted: boolean;
  at: string;
}): RateNightWrite[] {
  const { hotelId, stored, charges, prices, attempted, at } = input;
  const answered = new Map(
    (Array.isArray(prices) ? prices : []).map((p) => [p.night, p.price])
  );
  const writes: RateNightWrite[] = [];
  for (const night of input.aggregated) {
    const before = stored.get(night.night);
    const row: RateNightWrite = {
      hotel_id: hotelId,
      night: night.night,
      rooms_sold: night.roomsSold,
      updated_at: at,
    };
    let changed = !before || before.rooms_sold !== night.roomsSold;

    if (charges !== undefined) {
      row.priced_rooms = night.pricedRooms;
      row.revenue_net = night.revenueNet;
      row.revenue_gross = night.revenueGross;
      changed ||=
        num(before?.priced_rooms) !== night.pricedRooms ||
        num(before?.revenue_net) !== night.revenueNet ||
        num(before?.revenue_gross) !== night.revenueGross;
    }
    let priceCurrency: string | null = null;
    if (attempted) {
      row.sell_from_attempted_at = at;
      changed = true;
      if (Array.isArray(prices)) {
        if (answered.has(night.night)) {
          const price = answered.get(night.night) ?? null;
          row.sell_from_net = price?.net ?? null;
          row.sell_from_gross = price?.gross ?? null;
          row.sell_from_checked_at = at;
          priceCurrency = price?.currency ?? null;
        } else {
          row.sell_from_net = num(before?.sell_from_net);
          row.sell_from_gross = num(before?.sell_from_gross);
          row.sell_from_checked_at = before?.sell_from_checked_at ?? null;
        }
      }
    }
    if (charges !== undefined || Array.isArray(prices)) {
      // The revenue's currency, else the price's, else what was stored.
      row.currency = night.currency ?? priceCurrency ?? before?.currency ?? null;
    }
    if (changed) writes.push(row);
  }
  return writes;
}

/** The day's snapshot rows: this run's numbers, or the stored ones where revenue failed. */
export function planSnapshot(input: {
  hotelId: string;
  asOf: string;
  aggregated: RateNight[];
  stored: Map<string, StoredNightFull>;
  revenueKnown: boolean;
  at: string;
}): (Omit<SnapshotNight, "taken_at"> & { hotel_id: string; taken_at: string })[] {
  return input.aggregated.map((n) => {
    const before = input.stored.get(n.night);
    return {
      hotel_id: input.hotelId,
      as_of: input.asOf,
      night: n.night,
      rooms_sold: n.roomsSold,
      priced_rooms: input.revenueKnown ? n.pricedRooms : num(before?.priced_rooms),
      revenue_net: input.revenueKnown ? n.revenueNet : num(before?.revenue_net),
      taken_at: input.at,
    };
  });
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
  /** Lowest public price on sale, excl. VAT. Null: none, or unknown. */
  sellFrom: number | null;
  /** The PMS answered for this night recently and nothing was on sale. */
  nothingOnSale: boolean;
  /** Rooms booked yesterday for this night, net of cancellations. */
  pickupYesterday: number | null;
  /** The same over the last seven days. */
  pickupWeek: number | null;
}

export interface RateOutlook {
  currency: string | null;
  /** The source reports room charges (not the Sheet import). */
  hasRevenue: boolean;
  /** At least one night has a selling-price answer fresh enough to show. */
  hasSellingPrice: boolean;
  /**
   * Room nights booked yesterday for the nights both day snapshots cover
   * (tonight and the next 12), net of cancellations. Null until there are two
   * snapshots a day apart.
   */
  pickupYesterdayTotal: number | null;
  nights: RateOutlookNight[];
}

/**
 * A selling price older than this isn't shown. The sync re-checks hourly; a
 * price that hasn't been confirmed for six hours (the PMS keeps failing, or
 * stopped answering for that night) is no longer a fact about tonight.
 */
export const PRICE_FRESH_MS = 6 * 60 * 60 * 1000;

/**
 * Pickup compares two snapshots taken a day (or a week) apart. The sync takes
 * one at the first run after local midnight, but after a deploy, an outage or
 * a late first sync the gap can be off; a pair further apart than this from
 * the nominal gap isn't reported, rather than reported as "yesterday".
 */
const SNAPSHOT_SLACK_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  now?: Date;
}): RateOutlook | null {
  const { today } = input;
  const now = (input.now ?? new Date()).getTime();
  if (input.rows.length === 0) return null;

  const nights = nightsFrom(today, RATE_HORIZON_NIGHTS);
  const byNight = new Map(input.rows.map((r) => [r.night.slice(0, 10), r]));
  const snaps = (asOf: string) =>
    input.snapshots
      .filter((s) => s.as_of.slice(0, 10) === asOf)
      .map((s) => ({ ...s, night: s.night.slice(0, 10), rooms_sold: Number(s.rooms_sold) }));
  const takenAt = (rows: SnapshotNight[]) => {
    const t = rows.find((r) => r.taken_at)?.taken_at;
    return t ? new Date(t).getTime() : null;
  };
  // Pickup between today's snapshot and one `days` earlier — but only when
  // they were taken about that far apart (or the times aren't known).
  const pickup = (days: number) => {
    const later = snaps(today);
    const earlier = snaps(addDays(today, -days));
    const a = takenAt(later);
    const b = takenAt(earlier);
    if (a !== null && b !== null && Math.abs(a - b - days * DAY_MS) > SNAPSHOT_SLACK_MS) {
      return new Map<string, number>();
    }
    return pickupBetween(later, earlier);
  };
  const yesterday = pickup(1);
  const week = pickup(7);

  const currencyCounts = new Map<string, number>();
  for (const r of input.rows) {
    if (r.currency) currencyCounts.set(r.currency, (currencyCounts.get(r.currency) ?? 0) + 1);
  }
  const fresh = (r: StoredRateNight | undefined) =>
    Boolean(
      r?.sell_from_checked_at &&
        now - new Date(r.sell_from_checked_at).getTime() <= PRICE_FRESH_MS
    );

  return {
    currency:
      [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    hasRevenue: input.rows.some((r) => r.priced_rooms !== null),
    hasSellingPrice: nights.some((d) => fresh(byNight.get(d))),
    pickupYesterdayTotal:
      yesterday.size > 0 ? [...yesterday.values()].reduce((a, b) => a + b, 0) : null,
    nights: nights.map((date) => {
      const row = byNight.get(date);
      const priceKnown = fresh(row);
      const sellFrom = priceKnown ? n(row?.sell_from_net) : null;
      return {
        date,
        roomsSold: n(row?.rooms_sold) ?? 0,
        adr: adrOf(n(row?.revenue_net), n(row?.priced_rooms)),
        sellFrom,
        nothingOnSale: priceKnown && sellFrom === null,
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
