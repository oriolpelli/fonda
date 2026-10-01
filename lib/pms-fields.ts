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

/**
 * An id that is an id, not a label.
 *
 * MEWS sends GUIDs for room types and rooms; the sheet importer hashes the
 * room-type name to a sha1 (lib/sheet-parse.ts). Apaleo sends its unit-group
 * *code* — "DBL", "SUITE-A" — which is exactly what a GM calls the room type,
 * so the id is worth printing there and nowhere else. Sixteen-plus characters
 * of hex and dashes is the line between the two.
 */
const OPAQUE_ID = /^[0-9a-f][0-9a-f-]{15,}$/i;

/** The first non-empty string among `keys`, trimmed. */
function readString(raw: Json, keys: string[]): string | null {
  const r = asObject(raw);
  if (!r) return null;
  for (const key of keys) {
    const value = r[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * A human-readable room-type label, if the PMS gave us one.
 *
 * Only the sheet importer puts a name on the reservation itself; MEWS and
 * Apaleo put an id, which is why `requested_category_id` is the fallback — but
 * only when it reads as a label (see `OPAQUE_ID`). A GUID on Home would be
 * noise, so an opaque id returns null and the row simply shows no room type.
 */
export function readRoomType(
  raw: Json,
  categoryId?: string | null
): string | null {
  const name = readString(raw, ["RoomType", "roomType", "roomtype"]);
  if (name) return name;
  const id = categoryId?.trim();
  return id && !OPAQUE_ID.test(id) ? id : null;
}

/** The assigned room's name ("204"), if the PMS gave us one. Same rule. */
export function readRoom(raw: Json, spaceId?: string | null): string | null {
  const name = readString(raw, ["Room", "room", "SpaceName"]);
  if (name) return name;
  const id = spaceId?.trim();
  return id && !OPAQUE_ID.test(id) ? id : null;
}

/**
 * The guest's expected arrival time as the PMS holds it. Free text on purpose:
 * a sheet may say "16:30" and a MEWS note "late afternoon", and both are more
 * use to the desk than nothing.
 */
export function readEta(raw: Json): string | null {
  return readString(raw, ["Eta", "eta", "ArrivalTime", "arrivalTime"]);
}

// --- Reading only these keys from the database ------------------------------

/**
 * Every key the readers above look at, per table. The rest of `raw` — the bulk
 * of a MEWS payload — is never read by any page, so it is never fetched.
 *
 * Before 1 Oct every dashboard read selected `raw` whole: Home pulled the full
 * provider payload of every reservation in a 16-night window to answer "is
 * there a note?" (docs/audits/2026-10-01-performance.md §4.1). A reader that
 * starts looking at a new key must add it here, or it will only ever see null.
 */
const RAW_KEYS = {
  reservation: [
    "Notes",
    "notes",
    "RoomType",
    "roomType",
    "roomtype",
    "Room",
    "room",
    "SpaceName",
    "Eta",
    "eta",
    "ArrivalTime",
    "arrivalTime",
  ],
  customer: ["IsVip", "Classifications"],
} as const;

type RawTable = keyof typeof RAW_KEYS;

/**
 * Positional aliases (`pf_raw_0`…) rather than the key names: several keys
 * differ only by case, and an alias collision would silently drop one.
 */
const ALIAS = "pf_raw_";

/**
 * A PostgREST select fragment for just those keys, as JSON values (`->`, not
 * `->>`), so a boolean stays a boolean and an array an array — the readers
 * check types, and text would change their answers.
 */
function rawSelect(table: RawTable): string {
  return RAW_KEYS[table].map((key, i) => `${ALIAS}${i}:raw->${key}`).join(", ");
}

/** Use in place of `raw` in a `reservations` select. */
export const RESERVATION_RAW_SELECT = rawSelect("reservation");
/** Use in place of `raw` in a `customers` select. */
export const CUSTOMER_RAW_SELECT = rawSelect("customer");

/**
 * Puts a `raw` object back on rows read with one of the fragments above,
 * holding only the selected keys, and drops the aliases. The readers in this
 * file then work unchanged, and stay the only place that knows the keys'
 * meaning. A key the provider didn't send is simply absent, as it was before.
 */
export function withSlimRaw<T extends { raw: Json }>(
  rows: readonly unknown[],
  table: RawTable
): T[] {
  const keys = RAW_KEYS[table];
  return rows.map((row) => {
    const source = row as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(source)) {
      if (!field.startsWith(ALIAS)) out[field] = value;
    }
    const raw: Record<string, Json> = {};
    keys.forEach((key, i) => {
      const value = source[`${ALIAS}${i}`];
      if (value !== null && value !== undefined) raw[key] = value as Json;
    });
    out.raw = raw;
    return out as T;
  });
}
