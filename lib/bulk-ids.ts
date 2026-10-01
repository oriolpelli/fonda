/**
 * The ids a person confirmed in the bulk-send dialog (AI_ACT_PROMPTS.md A4),
 * cleaned before they reach a query.
 *
 * These cross the network from a client component, so they are treated as
 * untrusted input: anything that isn't a UUID is dropped, duplicates collapse,
 * and the list is capped. They only ever NARROW what a bulk action sends — the
 * action still applies its own hotel scope and eligibility filter on top, so a
 * forged id can at worst name a row that the filter then refuses.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** More than a GM could meaningfully have read in one confirmation. */
export const MAX_BULK_IDS = 200;

export function confirmedIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const clean = ids.filter(
    (id): id is string => typeof id === "string" && UUID.test(id)
  );
  return [...new Set(clean)].slice(0, MAX_BULK_IDS);
}
