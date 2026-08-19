import "server-only";

import { parseCsv } from "@/lib/csv";
import { decryptSecret, encryptSecret } from "@/lib/encryption";
import type {
  MewsReservation as PmsReservation,
  MewsCustomer as PmsCustomer,
  MewsRate as PmsRate,
  MewsSpacesResult as PmsSpacesResult,
} from "@/lib/mews";
import type { PmsClient } from "@/lib/pms";
import { matrixToRows, parseSheetRows, type ParsedSheet } from "@/lib/sheet-parse";
import { createAdminClient } from "@/lib/supabase/admin";

const FETCH_TIMEOUT_MS = 30000;

/**
 * Turn any Google Sheets URL — an edit/share link, a published-to-web link, or
 * an already-CSV endpoint — into a CSV export URL. Returns null if it is not a
 * recognisable Google Sheet. Regex-free on purpose.
 */
export function normalizeSheetCsvUrl(input: string): string | null {
  const url = input.trim();
  if (!url) return null;
  if (url.includes("output=csv") || url.includes("format=csv")) return url;
  if (url.includes("/spreadsheets/d/e/")) {
    return url.split("/pub")[0] + "/pub?output=csv";
  }
  if (url.includes("/spreadsheets/d/")) {
    const id = url.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0];
    if (!id) return null;
    let gid = "";
    if (url.includes("gid=")) {
      for (const ch of url.split("gid=")[1]) {
        if (ch >= "0" && ch <= "9") gid += ch;
        else break;
      }
    }
    const base = "https://docs.google.com/spreadsheets/d/" + id + "/export?format=csv";
    // No tab in the link → export the first sheet (more robust than assuming gid 0).
    return gid ? base + "&gid=" + gid : base;
  }
  return null;
}

async function fetchSheetRows(csvUrl: string): Promise<Record<string, string>[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(csvUrl, { redirect: "follow", signal: controller.signal });
    if (!res.ok) {
      throw new Error(
        "Could not read the sheet (" + res.status + "). Make sure it is a Google Sheet shared as “anyone with the link”, or published to the web. If you uploaded an Excel (.xlsx) file, open it in Google Sheets first and use File → Save as Google Sheets."
      );
    }
    const text = await res.text();
    const head = text.slice(0, 200).toLowerCase();
    if (head.includes("<html") || head.includes("<!doctype")) {
      throw new Error(
        "That link returned a sign-in page, not data. Share the sheet as “anyone with the link (Viewer)”, or use File → Share → Publish to web."
      );
    }
    return matrixToRows(parseCsv(text));
  } finally {
    clearTimeout(timer);
  }
}

/** Fetch + parse a sheet into canonical PMS shapes. Used by connect + preview. */
export async function loadSheet(csvUrl: string, hotelId: string): Promise<ParsedSheet> {
  return parseSheetRows(await fetchSheetRows(csvUrl), hotelId);
}

/** A PmsClient backed by a public Google Sheet CSV. Fetches once, then serves. */
export function createSheetClient(csvUrl: string, hotelId: string): PmsClient {
  let cache: ParsedSheet | null = null;
  async function data(): Promise<ParsedSheet> {
    if (!cache) cache = await loadSheet(csvUrl, hotelId);
    return cache;
  }
  return {
    async getReservations(
      startDate: string | Date,
      endDate: string | Date
    ): Promise<PmsReservation[]> {
      const start = new Date(startDate).toISOString();
      const end = new Date(endDate).toISOString();
      const { reservations } = await data();
      return reservations.filter((r) => r.EndUtc >= start && r.StartUtc <= end);
    },
    async getCustomers(customerIds: string[]): Promise<PmsCustomer[]> {
      const want = new Set(customerIds);
      const { customers } = await data();
      return customers.filter((c) => want.has(c.Id));
    },
    async getRates(): Promise<PmsRate[]> {
      return (await data()).rates;
    },
    async getSpaces(): Promise<PmsSpacesResult> {
      return (await data()).spaces;
    },
  };
}

/** Encrypt + store the hotel's sheet source, marking the PMS connected. */
export async function storeSheetSource(hotelId: string, rawUrl: string): Promise<void> {
  const csvUrl = normalizeSheetCsvUrl(rawUrl);
  if (!csvUrl) throw new Error("That does not look like a Google Sheets link.");
  const admin = createAdminClient();
  const { error } = await admin
    .from("hotels")
    .update({
      sheet_url_encrypted: encryptSecret(csvUrl),
      pms_type: "sheet",
      pms_connected: true,
    })
    .eq("id", hotelId);
  if (error) throw new Error("Failed to store sheet source: " + error.message);
}

export async function getSheetUrl(hotelId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hotels")
    .select("sheet_url_encrypted")
    .eq("id", hotelId)
    .single();
  if (error) throw new Error("Failed to load sheet source: " + error.message);
  if (!data?.sheet_url_encrypted) return null;
  return decryptSecret(data.sheet_url_encrypted);
}

export async function getSheetClientForHotel(hotelId: string): Promise<PmsClient | null> {
  const csvUrl = await getSheetUrl(hotelId);
  return csvUrl ? createSheetClient(csvUrl, hotelId) : null;
}
