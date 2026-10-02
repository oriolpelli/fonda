/**
 * Fixture check for the rate cache's arithmetic (B17) — lib/rate-math.ts.
 *
 *   npm run check:rates
 *
 * No database, no PMS, no network: every input is a hand-written payload in
 * the shape the MEWS and Apaleo docs give, so this runs anywhere and in a
 * second. It pins the rules that are easy to get subtly wrong — which nights
 * a charge lands on, what counts as a paid room, when a restriction closes a
 * night, what "rooms left" means, and how pickup is counted. It does NOT
 * prove the PMS payloads look like this in production; the preview check in
 * docs/audits/2026-10-02-B17-rate-cache.md does that.
 *
 * Exits 0 when every check passes, 1 otherwise.
 */

import {
  adrOf,
  aggregateNights,
  apaleoCheapestOffer,
  apaleoNightCharges,
  buildRateOutlook,
  isPublicSellableRate,
  mewsCheapestByNight,
  mewsNightCharges,
  mewsRoomsLeft,
  nightsFrom,
  durationMs,
  pickupBetween,
  planRateWrites,
  planSnapshot,
  restrictionCloses,
  weekdayOf,
  zonedMidnightUtc,
  type MewsAvailabilityLite,
  type MewsRateLite,
  type SnapshotNight,
  type StoredNightFull,
} from "../lib/rate-math";

let failures = 0;
let passes = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passes++;
  } else {
    failures++;
    console.log(`  FAIL  ${label}\n        got      ${a}\n        expected ${e}`);
  }
}

const TZ = "Europe/Madrid";

// --- time -------------------------------------------------------------------
check("Madrid midnight, summer time", zonedMidnightUtc(TZ, "2026-10-05").toISOString(), "2026-10-04T22:00:00.000Z");
check("Madrid midnight, the night DST ends", zonedMidnightUtc(TZ, "2026-10-25").toISOString(), "2026-10-24T22:00:00.000Z");
check("Madrid midnight, after DST", zonedMidnightUtc(TZ, "2026-10-26").toISOString(), "2026-10-25T23:00:00.000Z");
check("Canary midnight", zonedMidnightUtc("Atlantic/Canary", "2026-10-05").toISOString(), "2026-10-04T23:00:00.000Z");
check("bad zone falls back to UTC", zonedMidnightUtc("Not/AZone", "2026-10-05").toISOString(), "2026-10-05T00:00:00.000Z");
check("nights", nightsFrom("2026-10-30", 3), ["2026-10-30", "2026-10-31", "2026-11-01"]);
check("weekday", weekdayOf("2026-10-03"), "Saturday");

// --- aggregation ------------------------------------------------------------
const nights = ["2026-10-05", "2026-10-06", "2026-10-07"];
const stays = [
  { id: "A", arrival: "2026-10-05", departure: "2026-10-07" }, // 5th, 6th
  { id: "B", arrival: "2026-10-06", departure: "2026-10-07" }, // 6th (comp)
  { id: "C", arrival: "2026-10-06", departure: "2026-10-08" }, // 6th, 7th, no charges posted
];
const charges = [
  { reservationId: "A", night: "2026-10-05", net: 100, gross: 110, currency: "EUR" },
  { reservationId: "A", night: "2026-10-06", net: 100, gross: 110, currency: "EUR" },
  { reservationId: "A", night: "2026-10-06", net: -20, gross: -22, currency: "EUR" }, // rebate
  { reservationId: "B", night: "2026-10-06", net: 0, gross: 0, currency: "EUR" }, // complimentary
  { reservationId: "A", night: "2026-10-07", net: 100, gross: 110, currency: "EUR" }, // not a night A covers
  { reservationId: "Z", night: "2026-10-05", net: 999, gross: 999, currency: "EUR" }, // cancelled / unknown stay
];
const agg = aggregateNights(nights, stays, charges);
check("rooms sold", agg.map((n) => n.roomsSold), [1, 3, 1]);
check("paid rooms (comp and unposted excluded)", agg.map((n) => n.pricedRooms), [1, 1, 0]);
check("revenue net (rebate applied)", agg.map((n) => n.revenueNet), [100, 80, 0]);
check("revenue gross", agg.map((n) => n.revenueGross), [110, 88, 0]);
check("currency", agg[0].currency, "EUR");
check("ADR", agg.map((n) => adrOf(n.revenueNet, n.pricedRooms)), [100, 80, null]);
const sheet = aggregateNights(nights, stays, null);
check("no charges → nulls, not zeros", sheet.map((n) => [n.pricedRooms, n.revenueNet]), [[null, null], [null, null], [null, null]]);
const mixed = aggregateNights(["2026-10-05"], stays, [
  { reservationId: "A", night: "2026-10-05", net: 100, gross: 110, currency: "EUR" },
  { reservationId: "A", night: "2026-10-05", net: 50, gross: 50, currency: "GBP" },
  { reservationId: "A", night: "2026-10-05", net: 10, gross: 11, currency: "EUR" },
]);
check("two currencies are never added", [mixed[0].revenueNet, mixed[0].currency], [110, "EUR"]);

// --- MEWS charges -----------------------------------------------------------
const items = [
  { ServiceOrderId: "A", Type: "SpaceOrder", AccountingState: "Open", ConsumedUtc: "2026-10-04T22:00:00Z", Amount: { Currency: "EUR", NetValue: 100, GrossValue: 110 } },
  { ServiceOrderId: "A", Type: "NightRebate", AccountingState: "Closed", ConsumedUtc: "2026-10-04T22:00:00Z", Amount: { Currency: "EUR", NetValue: -10, GrossValue: -11 } },
  { ServiceOrderId: "A", Type: "ProductOrder", AccountingState: "Open", ConsumedUtc: "2026-10-04T22:00:00Z", Amount: { Currency: "EUR", NetValue: 15, GrossValue: 16.5 } }, // breakfast
  { ServiceOrderId: "A", Type: "SpaceOrder", AccountingState: "Canceled", ConsumedUtc: "2026-10-05T22:00:00Z", Amount: { Currency: "EUR", NetValue: 100, GrossValue: 110 } },
  { ServiceOrderId: "A", Type: "SpaceOrder", AccountingState: "Inactive", ConsumedUtc: "2026-10-05T22:00:00Z", Amount: { Currency: "EUR", NetValue: 0, GrossValue: 0 } },
  { ServiceOrderId: "B", Type: "CityTax", AccountingState: "Open", ConsumedUtc: "2026-10-05T22:00:00Z", Amount: { Currency: "EUR", NetValue: 2, GrossValue: 2 } },
];
check(
  "MEWS: room nights and rebates only, effective only, on the local night",
  mewsNightCharges(items, TZ).map((c) => [c.reservationId, c.night, c.net]),
  [["A", "2026-10-05", 100], ["A", "2026-10-05", -10]]
);

// --- MEWS rates -------------------------------------------------------------
const bar: MewsRateLite = { Id: "BAR", GroupId: "G1", ServiceId: "S", IsActive: true, IsEnabled: true, IsPublic: true, Type: "Public" };
const nonRef: MewsRateLite = { Id: "NR", GroupId: "G1", BaseRateId: "BAR", ServiceId: "S", IsActive: true, IsEnabled: true, IsPublic: true, Type: "Public" };
const corporate: MewsRateLite = { Id: "CORP", GroupId: "G2", ServiceId: "S", IsActive: true, IsEnabled: true, IsPublic: false, Type: "Private" };
const disabled: MewsRateLite = { ...bar, Id: "OLD", IsEnabled: false };
check("public rates", [bar, nonRef, corporate, disabled].map(isPublicSellableRate), [true, true, false, false]);

const sat = new Date("2026-10-02T22:00:00Z"); // night of Sat 3 Oct, Madrid
const NOW = new Date("2026-10-02T08:00:00Z"); // booking made Friday morning
const bk = { now: NOW, priceGross: 120 };
const closedStay = { Conditions: { Type: "Stay", ExactRateId: "NR", StartUtc: "2026-10-02T22:00:00Z", EndUtc: "2026-10-03T22:00:00Z" }, Exceptions: null };
check("Stay restriction closes its rate", restrictionCloses(closedStay, nonRef, "DBL", sat, "Saturday", bk), true);
check("… not another rate", restrictionCloses(closedStay, bar, "DBL", sat, "Saturday", bk), false);
check("… end is inclusive", restrictionCloses(closedStay, nonRef, "DBL", new Date("2026-10-03T22:00:00Z"), "Sunday", bk), true);
check("… and stops there", restrictionCloses(closedStay, nonRef, "DBL", new Date("2026-10-04T22:00:00Z"), "Monday", bk), false);
const minStay = { Conditions: { Type: "Stay", ExactRateId: "NR" }, Exceptions: { MinLength: "P0M2DT0H0M0S", MaxLength: null } };
check("a minimum stay doesn't close the night", restrictionCloses(minStay, nonRef, "DBL", sat, "Saturday", bk), false);
const arrival = { Conditions: { Type: "Start" }, Exceptions: null };
check("closed to arrival closes it for a guest arriving that night", restrictionCloses(arrival, bar, "DBL", sat, "Saturday", bk), true);
const departure = { Conditions: { Type: "End" }, Exceptions: null };
check("closed to departure doesn't", restrictionCloses(departure, bar, "DBL", sat, "Saturday", bk), false);
const earlyBooker = { Conditions: { Type: "Stay", ExactRateId: "NR" }, Exceptions: { MinAdvance: "P0M21DT0H0M0S" } };
check("early-booker rate (21 days ahead) is closed for this weekend", restrictionCloses(earlyBooker, nonRef, "DBL", sat, "Saturday", bk), true);
check("… and open 30 days out", restrictionCloses(earlyBooker, nonRef, "DBL", new Date("2026-11-01T23:00:00Z"), "Monday", bk), false);
const lastMinute = { Conditions: { Type: "Stay", ExactRateId: "NR" }, Exceptions: { MaxAdvance: "P0M3DT0H0M0S" } };
check("last-minute rate (within 3 days) is open tomorrow", restrictionCloses(lastMinute, nonRef, "DBL", sat, "Saturday", bk), false);
check("… and closed in a week", restrictionCloses(lastMinute, nonRef, "DBL", new Date("2026-10-09T22:00:00Z"), "Saturday", bk), true);
const priceFloor = { Conditions: { Type: "Stay" }, Exceptions: { MinPrice: { Value: 150, Currency: "EUR" } } };
check("a price floor closes cheaper prices", restrictionCloses(priceFloor, bar, "DBL", sat, "Saturday", bk), true);
check("… and spares dearer ones", restrictionCloses(priceFloor, bar, "DBL", sat, "Saturday", { now: NOW, priceGross: 160 }), false);
check("ISO durations", [durationMs("P0M21DT0H0M0S"), durationMs("PT36H"), durationMs("P1W"), durationMs("nonsense")], [21 * 864e5, 36 * 36e5, 7 * 864e5, null]);
const baseClosed = { Conditions: { Type: "Stay", BaseRateId: "BAR", Days: ["Saturday", "Sunday"] }, Exceptions: {} };
check("base-rate restriction reaches the derived rate", restrictionCloses(baseClosed, nonRef, "DBL", sat, "Saturday", bk), true);
check("… only on its days", restrictionCloses(baseClosed, nonRef, "DBL", new Date("2026-10-04T22:00:00Z"), "Monday", bk), false);
const dayObject = { Conditions: { Type: "Stay", Days: { Monday: true, Saturday: false } }, Exceptions: null };
check("older Days object form", restrictionCloses(dayObject, bar, "DBL", sat, "Saturday", bk), false);
const catOnly = { Conditions: { Type: "Stay", ResourceCategoryId: "SGL" }, Exceptions: null };
check("category restriction spares other categories", restrictionCloses(catOnly, bar, "DBL", sat, "Saturday", bk), false);

const starts = ["2026-10-02T22:00:00Z", "2026-10-03T22:00:00Z", "2026-10-04T22:00:00Z"]; // Sat 3, Sun 4, Mon 5
const availability: MewsAvailabilityLite[] = [{
  TimeUnitStartsUtc: starts,
  ResourceCategoryAvailabilities: [
    { ResourceCategoryId: "SGL", Metrics: { UsableResources: [5, 5, 5], Occupied: [5, 1, 1], OtherServiceReservationCount: [0, 0, 0], HouseUse: [0, 1, 0], PublicAvailabilityAdjustment: [0, 0, -4] } },
    { ResourceCategoryId: "DBL", Metrics: { UsableResources: [10, 10, 10], Occupied: [3, 3, null], PublicAvailabilityAdjustment: [0, 0, 0] } },
  ],
}];
check(
  "rooms left (sold out, house use, held back, unknown)",
  [...mewsRoomsLeft(availability, TZ).entries()].map(([k, v]) => [k, [...v.entries()]]),
  [["SGL", [["2026-10-03", 0], ["2026-10-04", 3], ["2026-10-05", 0]]], ["DBL", [["2026-10-03", 7], ["2026-10-04", 7]]]]
);
const price = (net: number) => ({ Currency: "EUR", NetValue: net, GrossValue: Math.round(net * 110) / 100 });
const pricing = [
  { rateId: "BAR", TimeUnitStartsUtc: starts, CategoryPrices: [
    { CategoryId: "SGL", AmountPrices: [price(90), price(90), price(90)] },
    { CategoryId: "DBL", AmountPrices: [price(130), price(120), price(120)] },
  ] },
  { rateId: "NR", TimeUnitStartsUtc: starts, CategoryPrices: [
    { CategoryId: "SGL", AmountPrices: [price(81), price(81), price(81)] },
    { CategoryId: "DBL", AmountPrices: [price(117), price(108), price(108)] },
  ] },
  { rateId: "CORP", TimeUnitStartsUtc: starts, CategoryPrices: [
    { CategoryId: "SGL", AmountPrices: [price(50), price(50), price(50)] },
  ] },
];
const cheapest = mewsCheapestByNight({
  tz: TZ,
  nights: ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06"],
  rates: [bar, nonRef, corporate],
  pricing,
  restrictions: [closedStay],
  availability,
  now: NOW,
});
// Sat 3: singles sold out; NR closed (closedStay) → BAR double 130.
// Sun 4: NR still closed (inclusive end) → BAR single 90 (one left after house use).
// Mon 5: singles held back to 0, doubles' availability unknown → can't tell (left out).
// Tue 6: no prices at all → can't tell (left out).
check("MEWS cheapest open price per night", cheapest.map((p) => [p.night, p.price?.net ?? null]), [["2026-10-03", 130], ["2026-10-04", 90]]);
const soldOut = mewsCheapestByNight({
  tz: TZ,
  nights: ["2026-10-03"],
  rates: [bar],
  pricing: [{ rateId: "BAR", TimeUnitStartsUtc: [starts[0]], CategoryPrices: [{ CategoryId: "SGL", AmountPrices: [price(90)] }] }],
  restrictions: [],
  availability,
  now: NOW,
});
check("MEWS: every candidate judged and sold out → nothing on sale", soldOut, [{ night: "2026-10-03", price: null }]);

// --- Apaleo -----------------------------------------------------------------
const apaleoRes = [
  { id: "R1", status: "Confirmed", timeSlices: [
    { from: "2026-10-05T15:00:00+02:00", serviceDate: "2026-10-05", baseAmount: { grossAmount: 132, netAmount: 120, currency: "EUR" } },
    { from: "2026-10-06T15:00:00+02:00", baseAmount: { grossAmount: 132, netAmount: 120, currency: "EUR" } },
  ] },
  { id: "R2", status: "Canceled", timeSlices: [{ serviceDate: "2026-10-05", baseAmount: { grossAmount: 99, netAmount: 90, currency: "EUR" } }] },
];
check(
  "Apaleo: one charge per slice, cancelled stays carry none",
  apaleoNightCharges(apaleoRes, TZ).map((c) => [c.reservationId, c.night, c.net, c.gross]),
  [["R1", "2026-10-05", 120, 132], ["R1", "2026-10-06", 120, 132]]
);
check(
  "Apaleo: cheapest offer with a unit left",
  apaleoCheapestOffer("2026-10-05", [
    { availableUnits: 0, timeSlices: [{ baseAmount: { netAmount: 70, grossAmount: 77, currency: "EUR" } }] },
    { availableUnits: 3, timeSlices: [{ baseAmount: { netAmount: 110, grossAmount: 121, currency: "EUR" } }] },
    { availableUnits: 1, timeSlices: [{ baseAmount: { netAmount: 95, grossAmount: 104.5, currency: "EUR" } }] },
  ]),
  { night: "2026-10-05", net: 95, gross: 104.5, currency: "EUR" }
);
check("Apaleo: no offers → null", apaleoCheapestOffer("2026-10-05", []), null);

// --- pickup and the outlook -------------------------------------------------
const today = "2026-10-05";
const snap = (as_of: string, night: string, rooms_sold: number): SnapshotNight => ({ as_of, night, rooms_sold, priced_rooms: null, revenue_net: null, taken_at: `${as_of}T22:05:00Z` });
const snapshots = [
  snap("2026-10-05", "2026-10-05", 20), snap("2026-10-05", "2026-10-06", 15), snap("2026-10-05", "2026-10-18", 3),
  snap("2026-10-04", "2026-10-05", 18), snap("2026-10-04", "2026-10-06", 16),
  snap("2026-09-28", "2026-10-05", 10),
];
check("pickup between snapshots", [...pickupBetween(snapshots.filter((s) => s.as_of === "2026-10-05"), snapshots.filter((s) => s.as_of === "2026-10-04")).entries()], [["2026-10-05", 2], ["2026-10-06", -1]]);
const NOON = new Date("2026-10-05T10:00:00Z");
const outlook = buildRateOutlook({
  today,
  now: NOON,
  rows: [
    { night: "2026-10-05", rooms_sold: 20, priced_rooms: 19, revenue_net: 2280, sell_from_net: 95, sell_from_checked_at: "2026-10-05T06:00:00Z", currency: "EUR" },
    { night: "2026-10-06", rooms_sold: 15, priced_rooms: 15, revenue_net: 1650, sell_from_net: null, sell_from_checked_at: "2026-10-05T06:00:00Z", currency: "EUR" },
    { night: "2026-10-07", rooms_sold: 9, priced_rooms: 9, revenue_net: 900, sell_from_net: 80, sell_from_checked_at: "2026-10-04T23:00:00Z", currency: "EUR" },
  ],
  snapshots,
});
check("outlook: 14 nights", outlook?.nights.length, 14);
check("outlook: tonight", outlook?.nights[0], { date: "2026-10-05", roomsSold: 20, adr: 120, sellFrom: 95, nothingOnSale: false, pickupYesterday: 2, pickupWeek: 10 });
check("outlook: tomorrow, nothing on sale", outlook?.nights[1], { date: "2026-10-06", roomsSold: 15, adr: 110, sellFrom: null, nothingOnSale: true, pickupYesterday: -1, pickupWeek: null });
check("outlook: a price 11 h old isn't shown", outlook?.nights[2], { date: "2026-10-07", roomsSold: 9, adr: 100, sellFrom: null, nothingOnSale: false, pickupYesterday: null, pickupWeek: null });
check("outlook: an unsynced night", outlook?.nights[3], { date: "2026-10-08", roomsSold: 0, adr: null, sellFrom: null, nothingOnSale: false, pickupYesterday: null, pickupWeek: null });
check("outlook: totals and flags", [outlook?.pickupYesterdayTotal, outlook?.hasRevenue, outlook?.hasSellingPrice, outlook?.currency], [1, true, true, "EUR"]);
check("outlook: empty cache → null", buildRateOutlook({ today, rows: [], snapshots: [] }), null);
const lateSnapshot = snapshots.map((s) => (s.as_of === today ? { ...s, taken_at: "2026-10-05T12:30:00Z" } : s));
check(
  "outlook: snapshots not a day apart → no 'yesterday'",
  buildRateOutlook({ today, now: NOON, rows: [{ night: today, rooms_sold: 20, priced_rooms: null, revenue_net: null, sell_from_net: null, sell_from_checked_at: null, currency: null }], snapshots: lateSnapshot })?.pickupYesterdayTotal,
  null
);
check(
  "outlook: a Sheet hotel has neither revenue nor prices",
  (() => { const o = buildRateOutlook({ today, now: NOON, rows: [{ night: today, rooms_sold: 3, priced_rooms: null, revenue_net: null, sell_from_net: null, sell_from_checked_at: null, currency: null }], snapshots: [] }); return [o?.hasRevenue, o?.hasSellingPrice, o?.nights[0].nothingOnSale]; })(),
  [false, false, false]
);
check(
  "outlook: first day — no yesterday snapshot, no pickup",
  buildRateOutlook({ today, rows: [{ night: today, rooms_sold: 1, priced_rooms: null, revenue_net: null, sell_from_net: null, sell_from_checked_at: null, currency: null }], snapshots: [snap(today, today, 1)] })?.pickupYesterdayTotal,
  null
);

// --- what a sync run writes -------------------------------------------------
const AT = "2026-10-05T10:00:00.000Z";
const three = aggregateNights(nights, stays, charges);
const stored = new Map<string, StoredNightFull>(
  nights.map((night, i) => [night, {
    night, rooms_sold: three[i].roomsSold, priced_rooms: three[i].pricedRooms, revenue_net: three[i].revenueNet,
    revenue_gross: three[i].revenueGross, sell_from_net: 99, sell_from_gross: 108.9,
    sell_from_checked_at: "2026-10-05T08:00:00.000Z", sell_from_attempted_at: "2026-10-05T08:00:00.000Z", currency: "EUR",
  }])
);
const keysOf = (rows: object[]) => [...new Set(rows.map((r) => Object.keys(r).sort().join(",")))];
const plan = (o: Partial<Parameters<typeof planRateWrites>[0]>) =>
  planRateWrites({ hotelId: "H", aggregated: three, stored, charges, prices: undefined, attempted: false, at: AT, ...o });

check("nothing changed, nothing asked → no writes", plan({}).length, 0);
const sheetRun = planRateWrites({ hotelId: "H", aggregated: sheet, stored: new Map(), charges: null, prices: null, attempted: false, at: AT });
check("Sheet: no price column is ever written (the review's high finding)", keysOf(sheetRun), ["currency,hotel_id,night,priced_rooms,revenue_gross,revenue_net,rooms_sold,updated_at"]);
const failedPrices = plan({ attempted: true, prices: undefined });
check("prices failed: only the attempt time moves, on every row", [failedPrices.length, keysOf(failedPrices)], [3, ["currency,hotel_id,night,priced_rooms,revenue_gross,revenue_net,rooms_sold,sell_from_attempted_at,updated_at"]]);
const revenueFailed = plan({ charges: undefined, attempted: true, prices: undefined });
check("revenue and prices failed: stored revenue untouched", keysOf(revenueFailed), ["hotel_id,night,rooms_sold,sell_from_attempted_at,updated_at"]);
const partial = plan({
  attempted: true,
  prices: [
    { night: "2026-10-05", price: { night: "2026-10-05", net: 90, gross: 99, currency: "EUR" } },
    { night: "2026-10-06", price: null },
  ],
});
check("partial answer: one key set for every row", keysOf(partial).length, 1);
check(
  "partial answer: priced, nothing on sale, can't tell (kept)",
  partial.map((r) => [r.night, r.sell_from_net, r.sell_from_checked_at]),
  [["2026-10-05", 90, AT], ["2026-10-06", null, AT], ["2026-10-07", 99, "2026-10-05T08:00:00.000Z"]]
);
check(
  "snapshot falls back to stored revenue when the charges failed",
  planSnapshot({ hotelId: "H", asOf: "2026-10-05", aggregated: sheet, stored, revenueKnown: false, at: AT }).map((r) => [r.rooms_sold, r.priced_rooms, r.revenue_net]),
  [[1, 1, 100], [3, 1, 80], [1, 0, 0]]
);

console.log(`${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
