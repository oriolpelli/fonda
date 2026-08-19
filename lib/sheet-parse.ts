import "server-only";

import { createHash } from "node:crypto";

import type {
  MewsReservation as PmsReservation,
  MewsCustomer as PmsCustomer,
  MewsRate as PmsRate,
  MewsSpace as PmsSpace,
  MewsSpaceCategory as PmsSpaceCategory,
  MewsSpaceCategoryAssignment as PmsAssignment,
  MewsSpacesResult as PmsSpacesResult,
  MewsReservationState as PmsReservationState,
} from "@/lib/mews";

const SERVICE_ID = "sheet";

/** Accepted header spellings (lower-cased) for each logical field. */
const ALIASES: Record<string, string[]> = {
  ref: ["booking ref", "ref", "reference", "booking", "booking id", "id", "localizador"],
  status: ["status", "estado"],
  first: ["first name", "first", "firstname", "nombre"],
  last: ["last name", "last", "lastname", "surname", "apellidos", "apellido"],
  email: ["email", "e-mail", "correo", "mail"],
  phone: ["phone", "telefono", "tel", "mobile"],
  nationality: ["nat.", "nat", "nationality", "nacionalidad", "country", "pais"],
  language: ["lang.", "lang", "language", "idioma"],
  arrival: ["arrival", "check-in", "checkin", "arrival date", "llegada", "entrada"],
  departure: ["departure", "check-out", "checkout", "departure date", "salida"],
  eta: ["arrival time", "eta", "hora llegada"],
  roomtype: ["room type", "type", "room category", "tipo", "tipo habitacion"],
  room: ["room", "room no", "room number", "habitacion", "hab"],
  rate: ["rate plan", "rate", "tarifa", "plan"],
  adults: ["adults", "adult", "adultos", "pax"],
  children: ["children", "child", "kids", "ninos"],
  vip: ["vip"],
  notes: ["special requests / notes", "notes", "note", "special requests", "notas", "observaciones"],
  source: ["source", "origin", "channel", "origen", "canal"],
  group: ["group", "group id", "grupo"],
};

function pick(row: Record<string, string>, key: string): string {
  for (const name of ALIASES[key] ?? [key]) {
    const v = row[name];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function sha1(...parts: string[]): string {
  return createHash("sha1").update(parts.join(" ")).digest("hex");
}

const STATUS_MAP: Record<string, PmsReservationState> = {
  confirmed: "Confirmed",
  "checked-in": "Started",
  "checked in": "Started",
  checkedin: "Started",
  "in-house": "Started",
  started: "Started",
  "checked-out": "Processed",
  "checked out": "Processed",
  departed: "Processed",
  processed: "Processed",
  option: "Optional",
  optional: "Optional",
  tentative: "Optional",
  cancelled: "Canceled",
  canceled: "Canceled",
  enquiry: "Enquired",
};

function mapStatus(s: string): PmsReservationState {
  return STATUS_MAP[s.trim().toLowerCase()] ?? "Confirmed";
}

function truthy(v: string): boolean {
  return ["yes", "y", "true", "1", "si", "sí", "x", "vip"].includes(v.trim().toLowerCase());
}

/**
 * Parse a date cell to an ISO UTC-midnight string, or null. Accepts ISO
 * (YYYY-MM-DD) and day-first DD/MM/YYYY or DD-MM-YYYY (European hotels).
 */
export function parseSheetDate(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  const iso = s.slice(0, 10);
  if (iso.length === 10 && iso[4] === "-" && iso[7] === "-") {
    const d = new Date(iso + "T00:00:00Z");
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const sep = s.includes("/") ? "/" : s.includes("-") ? "-" : "";
  if (!sep) return null;
  const p = s.split(sep);
  if (p.length < 3) return null;
  const day = parseInt(p[0], 10);
  const month = parseInt(p[1], 10);
  let year = parseInt(p[2].slice(0, 4), 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (year < 100) year += 2000;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const d = new Date(year + "-" + mm + "-" + dd + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Column-name hints used to find the header row when it is not row 1 (hotels
 * often put a title or notes above it, and multi-tab exports vary). */
const HEADER_HINTS = [
  "arrival", "check-in", "checkin", "llegada", "entrada",
  "departure", "check-out", "salida",
  "booking", "ref", "reference", "localizador",
  "first name", "last name", "nombre", "apellidos",
  "room", "habitacion", "email", "correo",
];

/**
 * Turn a raw CSV matrix into row objects, finding the header row rather than
 * assuming it is the first line. Scans for the first row where at least two
 * cells look like known columns; falls back to row 0 if nothing matches.
 */
export function matrixToRows(matrix: string[][]): Record<string, string>[] {
  if (matrix.length === 0) return [];
  let headerIdx = 0;
  for (let r = 0; r < Math.min(matrix.length, 30); r++) {
    const hits = matrix[r].filter((c) => {
      const v = c.trim().toLowerCase();
      return v.length > 0 && HEADER_HINTS.some((h) => v === h || v.includes(h));
    }).length;
    if (hits >= 2) { headerIdx = r; break; }
  }
  const headers = matrix[headerIdx].map((h) => h.trim().toLowerCase());
  const out: Record<string, string>[] = [];
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const cells = matrix[r];
    if (cells.every((c) => c.trim() === "")) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? "").trim(); });
    out.push(obj);
  }
  return out;
}

export interface ParsedSheet {
  reservations: PmsReservation[];
  customers: PmsCustomer[];
  rates: PmsRate[];
  spaces: PmsSpacesResult;
  warnings: string[];
}

/**
 * Map hotel-friendly sheet rows onto the canonical PMS shapes. One row = one
 * booking + its guest. Untyped extras (Notes, IsVip, Eta, Origin, room/type/
 * rate names) ride along on the reservation object and are stored verbatim in
 * reservations.raw, exactly where lib/pms-fields.ts reads VIP and notes from.
 */
export function parseSheetRows(
  rows: Record<string, string>[],
  hotelId: string
): ParsedSheet {
  const reservations: PmsReservation[] = [];
  const customersById = new Map<string, PmsCustomer>();
  const rateNames = new Set<string>();
  const spaceById = new Map<string, PmsSpace>();
  const categoryById = new Map<string, PmsSpaceCategory>();
  const assignments: PmsAssignment[] = [];
  const warnings: string[] = [];

  rows.forEach((row, idx) => {
    const line = idx + 2;
    const ref = pick(row, "ref") || "row-" + line;
    const first = pick(row, "first");
    const last = pick(row, "last");
    const email = pick(row, "email");
    const arrival = parseSheetDate(pick(row, "arrival"));
    const departure = parseSheetDate(pick(row, "departure"));

    if (!first && !last && !email) {
      warnings.push("Row " + line + ": no guest name or email — skipped.");
      return;
    }
    if (!arrival || !departure) {
      warnings.push("Row " + line + " (" + ref + "): missing or unreadable arrival/departure — skipped.");
      return;
    }
    if (departure < arrival) {
      warnings.push("Row " + line + " (" + ref + "): departure before arrival — skipped.");
      return;
    }

    const custId = sha1(hotelId, (email || first + " " + last).toLowerCase());
    if (!customersById.has(custId)) {
      customersById.set(custId, {
        Id: custId,
        FirstName: first || null,
        LastName: last || null,
        Email: email || null,
        Phone: pick(row, "phone") || null,
        NationalityCode: pick(row, "nationality") || null,
        LanguageCode: pick(row, "language") || null,
      });
    }

    const roomType = pick(row, "roomtype");
    const room = pick(row, "room");
    const rate = pick(row, "rate");
    if (rate) rateNames.add(rate);

    let categoryId: string | null = null;
    if (roomType) {
      categoryId = sha1(hotelId, "cat", roomType.toLowerCase());
      if (!categoryById.has(categoryId)) {
        categoryById.set(categoryId, { Id: categoryId, ServiceId: SERVICE_ID, Name: roomType });
      }
    }
    let spaceId: string | null = null;
    if (room && room !== "—" && room !== "-") {
      spaceId = sha1(hotelId, "space", room.toLowerCase());
      if (!spaceById.has(spaceId)) {
        spaceById.set(spaceId, { Id: spaceId, Name: room, CategoryId: categoryId });
      }
      if (categoryId) {
        assignments.push({ Id: sha1(spaceId, categoryId), CategoryId: categoryId, SpaceId: spaceId });
      }
    }

    const adults = parseInt(pick(row, "adults"), 10);
    const children = parseInt(pick(row, "children"), 10);
    const group = pick(row, "group");
    const notes = pick(row, "notes");
    const eta = pick(row, "eta");
    const source = pick(row, "source");

    const reservation = {
      Id: sha1(hotelId, "res", ref.toLowerCase()),
      ServiceId: SERVICE_ID,
      GroupId: group ? sha1(hotelId, "grp", group.toLowerCase()) : undefined,
      Number: ref,
      State: mapStatus(pick(row, "status")),
      Origin: source || undefined,
      StartUtc: arrival,
      EndUtc: departure,
      RequestedCategoryId: categoryId,
      AssignedSpaceId: spaceId,
      AccountId: custId,
      AccountType: "Customer" as const,
      RateId: rate ? sha1(hotelId, "rate", rate.toLowerCase()) : null,
      AdultCount: isNaN(adults) ? undefined : adults,
      ChildCount: isNaN(children) ? undefined : children,
      Notes: notes || undefined,
      IsVip: truthy(pick(row, "vip")),
      Eta: eta || undefined,
      RoomType: roomType || undefined,
      Room: room || undefined,
      RateName: rate || undefined,
    } as unknown as PmsReservation;
    reservations.push(reservation);
  });

  const rates: PmsRate[] = [...rateNames].map((name) => ({
    Id: sha1(hotelId, "rate", name.toLowerCase()),
    ServiceId: SERVICE_ID,
    Name: name,
  }));

  const spaces: PmsSpacesResult = {
    spaces: [...spaceById.values()],
    spaceCategories: [...categoryById.values()],
    assignments,
  };

  return { reservations, customers: [...customersById.values()], rates, spaces, warnings };
}
