/**
 * Which parts of the hotel's data an answer was built from
 * (APP_UX_PROPOSAL.md §4.4).
 *
 * Plain module — no `server-only`, no React. The route derives the keys, the
 * chat thread renders them, and both import from here, the same arrangement
 * lib/inbox-sort.ts uses and for the same reason.
 *
 * KEYS, NEVER PROSE. What crosses the wire is `"arrivals"`, not "today's
 * arrivals" — the label is looked up in the dictionary on the client, so the
 * chips are translated like everything else and a source name can never carry
 * a guest's data by accident.
 *
 * These describe what was PUT IN FRONT of the model, not what it read. That is
 * an honest thing to say ("this answer was built from today's arrivals and
 * your inbox") and a claim we can actually stand behind; asking the model to
 * report what it used would be asking it to introspect, which it cannot do
 * reliably, and dressing a guess up as provenance is worse than no provenance.
 */

export const SOURCE_KEYS = [
  "arrivals",
  "departures",
  "inHouse",
  "occupancy",
  "inbox",
  "vip",
  "requests",
  "housePolicies",
  /** Nothing specific was in play — the generic fallback. */
  "hotelData",
] as const;

export type SourceKey = (typeof SOURCE_KEYS)[number];

export function isSourceKey(value: string): value is SourceKey {
  return (SOURCE_KEYS as readonly string[]).includes(value);
}

/** The shape this reads — a structural subset of HotelContext. */
export interface SourceProbe {
  today: {
    arrivals: unknown[];
    departures: unknown[];
    inHouse: unknown[];
    occupancyRate: number;
  };
  guests: {
    vipArrivals: unknown[];
    specialRequests: unknown[];
  };
  emails: { pendingCount: number };
}

/**
 * The non-empty blocks of the assembled context.
 *
 * Emptiness is the test, deliberately. A hotel with no arrivals today did not
 * have "today's arrivals" as a source, and saying otherwise would make the
 * chip decorative — which is the failure mode §7.4 warns about. When nothing
 * specific is in play the generic key is the only one returned, so a chip
 * always appears and always means something.
 */
export function sourcesFor(
  context: SourceProbe,
  hasHouseProfile: boolean
): SourceKey[] {
  const keys: SourceKey[] = [];
  if (context.today.arrivals.length > 0) keys.push("arrivals");
  if (context.today.departures.length > 0) keys.push("departures");
  if (context.today.inHouse.length > 0) keys.push("inHouse");
  if (context.today.occupancyRate > 0) keys.push("occupancy");
  if (context.emails.pendingCount > 0) keys.push("inbox");
  if (context.guests.vipArrivals.length > 0) keys.push("vip");
  if (context.guests.specialRequests.length > 0) keys.push("requests");
  if (hasHouseProfile) keys.push("housePolicies");
  return keys.length > 0 ? keys : ["hotelData"];
}
