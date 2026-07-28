/**
 * Reading the handful of fields we care about out of a PMS record's raw JSON.
 *
 * `reservations.raw` and `customers.raw` hold whatever MEWS (or Apaleo) sent us,
 * shapes we don't control and that differ per provider. These helpers are
 * deliberately forgiving: an unexpected shape returns "no VIP" / "no note"
 * rather than throwing, because one odd booking must never blank a page.
 *
 * Pure and dependency-free so the hotel context (which feeds the AI) and the
 * dashboard to-do rules read VIP status and room notes identically — a guest
 * flagged VIP in the brief must be the same guest flagged VIP on the dashboard.
 */

import type { Json } from "@/types/database";

function asObject(raw: Json): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

/** The free-text note on a booking (special requests, arrival remarks), if any. */
export function readNotes(raw: Json): string | null {
  const r = asObject(raw);
  const note = r?.Notes ?? r?.notes;
  return typeof note === "string" && note.trim() ? note.trim() : null;
}

/**
 * Whether the guest is flagged VIP. MEWS expresses this either as an explicit
 * boolean or as a free-text classification, so both are checked.
 */
export function readVip(raw: Json): boolean {
  const r = asObject(raw);
  if (!r) return false;
  if (typeof r.IsVip === "boolean") return r.IsVip;
  const c = r.Classifications;
  return (
    Array.isArray(c) &&
    c.some((x) => typeof x === "string" && x.toLowerCase().includes("vip"))
  );
}
