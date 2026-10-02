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
  pickupBetween,
  restrictionCloses,
  weekdayOf,
  zonedMidnightUtc,
  type MewsRateLite,
  type SnapshotNight,
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
const closedStay = { Conditions: { Type: "Stay", ExactRateId: "NR", StartUtc: "2026-10-02T22:00:00Z", EndUtc: "2026-10-03T22:00:00Z" }, Exceptions: null };
check("Stay restriction closes its rate", restrictionCloses(closedStay, nonRef, "DBL", sat, "Saturday"), true);
check("… not another rate", restrictionCloses(closedStay, bar, "DBL", sat, "Saturday"), false);
check("… end is inclusive", restrictionCloses(closedStay, nonRef, "DBL", new Date("2026-10-03T22:00:00Z"), "Sunday"), true);
check("… and stops there", restrictionCloses(closedStay, nonRef, "DBL", new Date("2026-10-04T22:00:00Z"), "Monday"), false);
const minStay = { Conditions: { Type: "Stay", ExactRateId: "NR" }, Exceptions: { MinLength: "P0M2DT0H0M0S", MaxLength: null } };
check("a minimum stay doesn't close the night", restrictionCloses(minStay, nonRef, "DBL", sat, "Saturday"), false);
const arrival = { Conditions: { Type: "Start" }, Exceptions: null };
check("closed-to-arrival doesn't take a night off sale", restrictionCloses(arrival, bar, "DBL", sat, "Saturday"), false);
const baseClosed = { Conditions: { Type: "Stay", BaseRateId: "BAR", Days: ["Saturday", "Sunday"] }, Exceptions: {} };
check("base-rate restriction reaches the derived rate", restrictionCloses(baseClosed, nonRef, "DBL", sat, "Saturday"), true);
check("… only on its days", restrictionCloses(baseClosed, nonRef, "DBL", new Date("2026-10-04T22:00:00Z"), "Monday"), false);
const dayObject = { Conditions: { Type: "Stay", Days: { Monday: true, Saturday: false } }, Exceptions: null };
check("older Days object form", restrictionCloses(dayObject, bar, "DBL", sat, "Saturday"), false);
const catOnly = { Conditions: { Type: "Stay", ResourceCategoryId: "SGL" }, Exceptions: null };
check("category restriction spares other categories", restrictionCloses(catOnly, bar, "DBL", sat, "Saturday"), false);

const starts = ["2026-10-02T22:00:00Z", "2026-10-03T22:00:00Z", "2026-10-04T22:00:00Z"]; // Sat 3, Sun 4, Mon 5
const availability = [{
  TimeUnitStartsUtc: starts,
  ResourceCategoryAvailabilities: [
    { ResourceCategoryId: "SGL", Metrics: { UsableResources: [5, 5, 5], Occupied: [5, 2, 1], OtherServiceReservationCount: [0, 0, 0], PublicAvailabilityAdjustment: [0, 0, -4] } },
    { ResourceCategoryId: "DBL", Metrics: { UsableResources: [10, 10, 10], Occupied: [3, 3, null], PublicAvailabilityAdjustment: [0, 0, 0] } },
  ],
}];
check(
  "rooms left (sold out, open, held back, unknown)",
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
  nights: ["2026-10-03", "2026-10-04", "2026-10-05"],
  rates: [bar, nonRef, corporate],
  pricing,
  restrictions: [closedStay],
  availability,
});
// Sat 3: singles sold out; NR closed (closedStay) → BAR double 130.
// Sun 4: NR still closed (inclusive end) → BAR single 90.
// Mon 5: singles held back to 0; double's availability unknown → nothing on sale.
check("MEWS cheapest open price per night", cheapest.map((p) => [p.night, p.net]), [["2026-10-03", 130], ["2026-10-04", 90]]);

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
const snap = (as_of: string, night: string, rooms_sold: number): SnapshotNight => ({ as_of, night, rooms_sold, priced_rooms: null, revenue_net: null });
const snapshots = [
  snap("2026-10-05", "2026-10-05", 20), snap("2026-10-05", "2026-10-06", 15), snap("2026-10-05", "2026-10-18", 3),
  snap("2026-10-04", "2026-10-05", 18), snap("2026-10-04", "2026-10-06", 16),
  snap("2026-09-28", "2026-10-05", 10),
];
check("pickup between snapshots", [...pickupBetween(snapshots.filter((s) => s.as_of === "2026-10-05"), snapshots.filter((s) => s.as_of === "2026-10-04")).entries()], [["2026-10-05", 2], ["2026-10-06", -1]]);
const outlook = buildRateOutlook({
  today,
  rows: [
    { night: "2026-10-05", rooms_sold: 20, priced_rooms: 19, revenue_net: 2280, sell_from_net: 95, sell_from_checked_at: "2026-10-05T06:00:00Z", currency: "EUR" },
    { night: "2026-10-06", rooms_sold: 15, priced_rooms: 15, revenue_net: 1650, sell_from_net: null, sell_from_checked_at: "2026-10-05T06:00:00Z", currency: "EUR" },
  ],
  snapshots,
});
check("outlook: 14 nights", outlook?.nights.length, 14);
check("outlook: tonight", outlook?.nights[0], { date: "2026-10-05", roomsSold: 20, adr: 120, sellFrom: 95, pickupYesterday: 2, pickupWeek: 10 });
check("outlook: tomorrow", outlook?.nights[1], { date: "2026-10-06", roomsSold: 15, adr: 110, sellFrom: null, pickupYesterday: -1, pickupWeek: null });
check("outlook: an unsynced night", outlook?.nights[2], { date: "2026-10-07", roomsSold: 0, adr: null, sellFrom: null, pickupYesterday: null, pickupWeek: null });
check("outlook: totals and flags", [outlook?.pickupYesterdayTotal, outlook?.hasRevenue, outlook?.hasSellingPrice, outlook?.currency], [1, true, true, "EUR"]);
check("outlook: empty cache → null", buildRateOutlook({ today, rows: [], snapshots: [] }), null);
check(
  "outlook: first day — no yesterday snapshot, no pickup",
  buildRateOutlook({ today, rows: [{ night: today, rooms_sold: 1, priced_rooms: null, revenue_net: null, sell_from_net: null, sell_from_checked_at: null, currency: null }], snapshots: [snap(today, today, 1)] })?.pickupYesterdayTotal,
  null
);

console.log(`${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
