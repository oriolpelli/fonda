import "server-only";

import * as Sentry from "@sentry/nextjs";

import { decryptSecret, encryptSecret } from "@/lib/encryption";
import type {
  MewsCustomer,
  MewsRate,
  MewsReservation,
  MewsReservationState,
  MewsSpace,
  MewsSpaceCategory,
  MewsSpaceCategoryAssignment,
  MewsSpacesResult,
} from "@/lib/mews";
import type { PmsClient } from "@/lib/pms";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Apaleo PMS client. Implements the shared {@link PmsClient} contract, mapping
 * Apaleo's REST API onto Fondas's canonical (MEWS-shaped) types so downstream
 * code works with either PMS unchanged.
 *
 * Auth: OAuth2. A long-lived refresh token (obtained via the authorization-code
 * flow in /connect/apaleo/callback) is exchanged for short-lived access tokens
 * on demand.
 *
 * Entity mappings are partial and defensive — Apaleo returns more fields than
 * Fondas uses, and shapes vary slightly across API versions.
 *
 * Docs: https://apaleo.dev/
 */

const APALEO_TOKEN_URL = "https://identity.apaleo.com/connect/token";
export const APALEO_AUTHORIZE_URL =
  "https://identity.apaleo.com/connect/authorize";
const APALEO_API_BASE = "https://api.apaleo.com";
const PAGE_SIZE = 100;
const MAX_PAGES = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Apaleo error bodies are short; cap what we quote so a stray HTML page can't
 *  flood a log line or a Sentry event. */
const MAX_ERROR_BODY_CHARS = 500;

const DEFAULTS = {
  maxRetries: 4,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  timeoutMs: 30000,
};

export interface ApaleoCredentials {
  refreshToken: string;
}

/** Query params for a request. Arrays repeat the key (`propertyIds=A&propertyIds=B`). */
type ApaleoQuery = Record<string, string | string[]>;

export class ApaleoApiError extends Error {
  readonly status?: number;
  readonly endpoint?: string;
  /** Apaleo's own words — the validation message from the response body. */
  readonly details?: string;

  constructor(
    message: string,
    opts: {
      status?: number;
      endpoint?: string;
      details?: string;
      cause?: unknown;
    } = {}
  ) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = "ApaleoApiError";
    this.status = opts.status;
    this.endpoint = opts.endpoint;
    this.details = opts.details;
  }
}

/**
 * Apaleo's error shapes. Validation failures (400/422) return
 * `MessageItemCollection` — `{ "messages": [...] }` — which is the only place
 * the API says *what* it rejected; the other keys cover the token endpoint and
 * whatever a proxy in front of the API might return.
 */
interface ApaleoErrorBody {
  messages?: string[];
  message?: string;
  detail?: string;
  title?: string;
  error_description?: string;
}

/**
 * The response body of a failed request, as a single line.
 *
 * Discarding this was why a 422 read "failed with status 422" and nothing else:
 * Apaleo tells you exactly which parameter it rejected, but only in the body.
 * Non-JSON bodies (an HTML gateway page) are quoted raw rather than dropped.
 */
async function readErrorBody(res: Response): Promise<string | undefined> {
  let text: string;
  try {
    text = await res.text();
  } catch {
    return undefined;
  }

  const trimmed = text.trim();
  if (!trimmed) return undefined;

  try {
    const body = JSON.parse(trimmed) as ApaleoErrorBody;
    const message =
      body.messages?.filter(Boolean).join(" ") ||
      body.message ||
      body.detail ||
      body.title ||
      body.error_description;
    if (message) return message.slice(0, MAX_ERROR_BODY_CHARS);
  } catch {
    // Not JSON — fall through and quote the raw text.
  }
  return trimmed.slice(0, MAX_ERROR_BODY_CHARS);
}

/**
 * Attaches the failed call to the Sentry scope instead of capturing it here:
 * the sync layer already captures the error that comes out of this
 * (lib/mews-sync.ts), and a second capture would report the same failure twice.
 * Query params carry dates, property ids and page numbers — no guest data — so
 * they are safe to record under `sendDefaultPii: false`.
 */
function recordApaleoFailure(
  endpoint: string,
  status: number,
  details: string | undefined,
  query: Record<string, string | string[]>
): void {
  Sentry.setContext("apaleo_request", {
    endpoint,
    status,
    query,
    apaleoMessage: details ?? null,
  });
  Sentry.addBreadcrumb({
    category: "apaleo",
    level: "error",
    message: `${status} ${endpoint}`,
    data: { query, apaleoMessage: details ?? null },
  });
}

/**
 * The interval cap named by a rejection, in days, if it names one.
 *
 * Apaleo does not document a maximum window for the reservations list and the
 * ±14-day sync window is well inside any plausible limit — but if a 422 ever
 * says "the interval must not exceed N days", splitting the window is the right
 * answer rather than failing the whole sync, so read the number back out of the
 * message. Requires both a limit word and a day count, so an unrelated message
 * that happens to mention days can't trigger chunking.
 */
function intervalLimitDays(message: string | undefined): number | null {
  if (!message) return null;
  if (!/interval|range|period|exceed|maximum|max\b/i.test(message)) return null;
  const match = /(\d+)\s*days?/i.exec(message);
  if (!match) return null;
  const days = Number(match[1]);
  return Number.isFinite(days) && days > 0 ? days : null;
}

/** Splits [start, end] into adjacent, non-overlapping slices each ≤ maxMs. */
function chunkDateRange(
  start: Date,
  end: Date,
  maxMs: number
): { start: Date; end: Date }[] {
  if (end.getTime() <= start.getTime()) return [{ start, end }];

  const chunks: { start: Date; end: Date }[] = [];
  const endMs = end.getTime();
  let cursor = start.getTime();
  while (cursor < endMs) {
    const next = Math.min(cursor + maxMs, endMs);
    chunks.push({ start: new Date(cursor), end: new Date(next) });
    cursor = next;
  }
  return chunks;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoff(attempt: number): number {
  return Math.random() * Math.min(DEFAULTS.maxDelayMs, DEFAULTS.baseDelayMs * 2 ** attempt);
}

function requireOAuthEnv(): { clientId: string; clientSecret: string } {
  const clientId = process.env.APALEO_CLIENT_ID;
  const clientSecret = process.env.APALEO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new ApaleoApiError(
      "APALEO_CLIENT_ID and APALEO_CLIENT_SECRET must be set."
    );
  }
  return { clientId, clientSecret };
}

/** Exchanges an authorization code for tokens (used by the OAuth callback). */
export async function exchangeApaleoCode(
  code: string,
  redirectUri: string
): Promise<{ refreshToken: string; accessToken: string }> {
  const { clientId, clientSecret } = requireOAuthEnv();
  const res = await fetch(APALEO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    const details = await readErrorBody(res);
    throw new ApaleoApiError(
      `Apaleo token exchange failed (${res.status})${details ? `: ${details}` : "."}`,
      { status: res.status, endpoint: "connect/token", details }
    );
  }
  const json = (await res.json()) as {
    refresh_token?: string;
    access_token?: string;
  };
  if (!json.refresh_token || !json.access_token) {
    throw new ApaleoApiError("Apaleo token exchange returned no tokens.");
  }
  return { refreshToken: json.refresh_token, accessToken: json.access_token };
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export function createApaleoClient(credentials: ApaleoCredentials): PmsClient {
  let accessToken: string | null = null;
  let expiresAt = 0;

  async function getAccessToken(): Promise<string> {
    if (accessToken && Date.now() < expiresAt) return accessToken;

    const { clientId, clientSecret } = requireOAuthEnv();
    const res = await fetch(APALEO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: credentials.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      const details = await readErrorBody(res);
      recordApaleoFailure("connect/token", res.status, details, {
        grant_type: "refresh_token",
      });
      throw new ApaleoApiError(
        `Apaleo token refresh failed (${res.status})${details ? `: ${details}` : "."}`,
        { status: res.status, endpoint: "connect/token", details }
      );
    }
    const json = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    accessToken = json.access_token;
    // Refresh 60s early to avoid edge-of-expiry failures.
    expiresAt = Date.now() + (json.expires_in - 60) * 1000;
    return accessToken;
  }

  async function apaleoFetch<T>(
    path: string,
    query: ApaleoQuery = {}
  ): Promise<T> {
    const url = new URL(APALEO_API_BASE + path);
    // Array params (propertyIds, status, expand…) repeat the key rather than
    // joining with commas — the form Apaleo's model binder expects.
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, item);
      } else {
        url.searchParams.set(key, value);
      }
    }

    let attempt = 0;
    while (true) {
      const token = await getAccessToken();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULTS.timeoutMs);
      let res: Response;
      try {
        res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });
      } catch (err) {
        if (attempt < DEFAULTS.maxRetries) {
          await sleep(backoff(attempt));
          attempt++;
          continue;
        }
        throw new ApaleoApiError(
          `Network error calling Apaleo ${path}: ${(err as Error).message}`,
          { endpoint: path, cause: err }
        );
      } finally {
        clearTimeout(timer);
      }

      // Every Apaleo list endpoint answers an empty page with 204 No Content,
      // which is `ok` but has no body — res.json() would throw on the empty
      // string. An empty object reads as "no rows" to every caller below.
      if (res.status === 204) return {} as T;
      if (res.ok) return (await res.json()) as T;

      if ((res.status === 429 || res.status >= 500) && attempt < DEFAULTS.maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : backoff(attempt));
        attempt++;
        continue;
      }

      // The body is where Apaleo names the parameter it rejected — a 422 is
      // useless without it.
      const details = await readErrorBody(res);
      recordApaleoFailure(path, res.status, details, query);
      throw new ApaleoApiError(
        `Apaleo request to ${path} failed with status ${res.status}` +
          (details ? `: ${details}` : "."),
        { status: res.status, endpoint: path, details }
      );
    }
  }

  /** Pages through a list endpoint, accumulating `collectionKey` across pages. */
  async function getAll<T>(
    path: string,
    collectionKey: string,
    query: ApaleoQuery = {}
  ): Promise<T[]> {
    const items: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const body = await apaleoFetch<Record<string, unknown>>(path, {
        ...query,
        pageNumber: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const rows = (body[collectionKey] as T[] | undefined) ?? [];
      items.push(...rows);
      const total = typeof body.count === "number" ? body.count : items.length;
      if (rows.length < PAGE_SIZE || items.length >= total) break;
    }
    return items;
  }

  /**
   * The account's property ids, fetched once per client (i.e. once per sync).
   *
   * Every list endpoint below is scoped to these. Fondas maps one Apaleo
   * account to one hotel, so a multi-property account is merged into that
   * hotel — but scoping still matters: an unscoped query is the whole account,
   * and it is the reservations list's widest possible read.
   */
  let propertyIds: string[] | null = null;
  async function getPropertyIds(): Promise<string[]> {
    if (propertyIds) return propertyIds;
    // Archived properties are excluded by default. Covered by setup.read,
    // though the endpoint itself requires no particular scope.
    const rows = await getAll<ApaleoProperty>(
      "/inventory/v1/properties",
      "properties"
    );
    propertyIds = rows.map((p) => p.id).filter(Boolean);
    return propertyIds;
  }

  /**
   * Property scopes to iterate. `null` means "don't send propertyIds" — the
   * unscoped query this client used to make, kept as the fallback for the case
   * where property discovery comes back empty, so a quirk there degrades to
   * the old behaviour instead of silently syncing nothing.
   */
  async function reservationScopes(): Promise<(string | null)[]> {
    const ids = await getPropertyIds();
    return ids.length > 0 ? ids : [null];
  }

  async function fetchReservations(
    propertyId: string | null,
    from: Date,
    to: Date
  ): Promise<ApaleoReservation[]> {
    return getAll<ApaleoReservation>(
      "/booking/v1/reservations",
      "reservations",
      {
        ...(propertyId ? { propertyIds: [propertyId] } : {}),
        dateFilter: "Stay",
        from: toApaleoDateTime(from),
        to: toApaleoDateTime(to),
      }
    );
  }

  return {
    /**
     * Reservations overlapping [startDate, endDate], per Apaleo's `Stay` filter
     * (the equivalent of the MEWS client's "Colliding").
     *
     * Two things had to change for this to stop 422-ing. `from`/`to` are
     * `date-time` in Apaleo's spec — ISO 8601 "without fractional second part"
     * — and this client was sending bare `YYYY-MM-DD` dates. And the query was
     * unscoped, so it asked for every property in the account at once.
     */
    async getReservations(startDate, endDate) {
      const start = parseApaleoDate(startDate);
      const end = parseApaleoDate(endDate);

      // Keyed by id: `Stay` returns a reservation for every window it overlaps,
      // so one spanning a chunk boundary comes back twice.
      const byId = new Map<string, MewsReservation>();

      for (const propertyId of await reservationScopes()) {
        let rows: ApaleoReservation[];
        try {
          rows = await fetchReservations(propertyId, start, end);
        } catch (err) {
          // If the rejection names a maximum interval, honour it and retry in
          // chunks rather than failing the sync (see intervalLimitDays).
          const limitDays =
            err instanceof ApaleoApiError && err.status === 422
              ? intervalLimitDays(err.details)
              : null;
          if (!limitDays) throw err;

          rows = [];
          for (const chunk of chunkDateRange(start, end, limitDays * DAY_MS)) {
            rows.push(
              ...(await fetchReservations(propertyId, chunk.start, chunk.end))
            );
          }
        }
        for (const row of rows) byId.set(row.id, mapReservation(row));
      }

      return [...byId.values()];
    },

    async getCustomers(customerIds) {
      // Apaleo embeds the guest in the reservation, so "customer id" is the
      // reservation id (see mapReservation). Fetch each and extract the guest.
      const ids = [...new Set(customerIds.filter(Boolean))];
      const results = await Promise.all(
        ids.map((id) =>
          apaleoFetch<ApaleoReservationDetail>(
            `/booking/v1/reservations/${encodeURIComponent(id)}`
          ).catch(() => null)
        )
      );
      return results
        .filter((r): r is ApaleoReservationDetail => r !== null)
        .map(mapCustomer);
    },

    // Rate plans and inventory take a singular `propertyId`, so a
    // multi-property account is one request per property, merged — the same
    // scoping the reservations list gets above.
    async getRates() {
      const scopes = await reservationScopes();
      const pages = await Promise.all(
        scopes.map((propertyId) =>
          getAll<ApaleoRatePlan>("/rateplan/v1/rate-plans", "ratePlans", {
            ...(propertyId ? { propertyId } : {}),
          })
        )
      );
      return pages.flat().map(mapRate);
    },

    async getSpaces(): Promise<MewsSpacesResult> {
      const scopes = await reservationScopes();
      const [unitPages, unitGroupPages] = await Promise.all([
        Promise.all(
          scopes.map((propertyId) =>
            getAll<ApaleoUnit>("/inventory/v1/units", "units", {
              ...(propertyId ? { propertyId } : {}),
            })
          )
        ),
        Promise.all(
          scopes.map((propertyId) =>
            getAll<ApaleoUnitGroup>(
              "/inventory/v1/unit-groups",
              "unitGroups",
              { ...(propertyId ? { propertyId } : {}) }
            )
          )
        ),
      ]);
      const units = unitPages.flat();
      const unitGroups = unitGroupPages.flat();

      const spaces = units.map(mapSpace);
      const spaceCategories = unitGroups.map(mapSpaceCategory);
      const assignments: MewsSpaceCategoryAssignment[] = units
        .filter((u) => u.unitGroupId)
        .map((u) => ({
          Id: `${u.id}:${u.unitGroupId}`,
          CategoryId: u.unitGroupId as string,
          SpaceId: u.id,
        }));

      return { spaces, spaceCategories, assignments };
    },
  };
}

// ---------------------------------------------------------------------------
// Apaleo response shapes (partial) and mappers to canonical types
// ---------------------------------------------------------------------------

interface ApaleoReservation {
  id: string;
  bookingId?: string;
  status?: string;
  arrival?: string;
  departure?: string;
  created?: string;
  modified?: string;
  adults?: number;
  children?: number;
  property?: { id?: string };
  unitGroup?: { id?: string };
  unit?: { id?: string };
  ratePlan?: { id?: string };
}

interface ApaleoGuest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  nationalityCountryCode?: string;
  preferredLanguage?: string;
}

interface ApaleoReservationDetail extends ApaleoReservation {
  primaryGuest?: ApaleoGuest;
}

interface ApaleoRatePlan {
  id: string;
  name?: string;
  code?: string;
  isActive?: boolean;
  property?: { id?: string };
}

interface ApaleoProperty {
  id: string;
  code?: string;
  name?: string;
}

interface ApaleoUnit {
  id: string;
  name?: string;
  unitGroupId?: string;
  status?: { condition?: string };
}

interface ApaleoUnitGroup {
  id: string;
  name?: string;
  maxPersons?: number;
  property?: { id?: string };
}

function parseApaleoDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApaleoApiError(`Invalid date passed to Apaleo client: ${String(value)}`);
  }
  return date;
}

/**
 * Apaleo's `from`/`to` are `date-time`, not `date`: ISO 8601 in UTC or with a
 * UTC offset, and explicitly "without fractional second part". So neither the
 * `YYYY-MM-DD` this client used to send nor a plain `toISOString()` (which
 * carries milliseconds) satisfies it — trim to whole seconds.
 */
function toApaleoDateTime(value: string | Date): string {
  return parseApaleoDate(value).toISOString().replace(/\.\d+Z$/, "Z");
}

function mapReservationState(status?: string): MewsReservationState {
  switch (status) {
    case "InHouse":
      return "Started";
    case "CheckedOut":
      return "Processed";
    case "Canceled":
    case "NoShow":
      return "Canceled";
    case "Confirmed":
    default:
      return "Confirmed";
  }
}

function mapReservation(r: ApaleoReservation): MewsReservation {
  return {
    Id: r.id,
    ServiceId: r.property?.id ?? "",
    GroupId: r.bookingId,
    Number: r.id,
    State: mapReservationState(r.status),
    StartUtc: r.arrival ?? "",
    EndUtc: r.departure ?? "",
    CreatedUtc: r.created,
    UpdatedUtc: r.modified,
    RequestedCategoryId: r.unitGroup?.id ?? null,
    AssignedSpaceId: r.unit?.id ?? null,
    AccountId: r.id, // surrogate guest key (Apaleo embeds the guest)
    RateId: r.ratePlan?.id ?? null,
    AdultCount: r.adults,
    ChildCount: r.children,
  };
}

function mapCustomer(detail: ApaleoReservationDetail): MewsCustomer {
  const g = detail.primaryGuest ?? {};
  return {
    Id: detail.id,
    FirstName: g.firstName ?? null,
    LastName: g.lastName ?? null,
    Email: g.email ?? null,
    Phone: g.phone ?? null,
    Title: g.title ?? null,
    NationalityCode: g.nationalityCountryCode ?? null,
    LanguageCode: g.preferredLanguage ?? null,
  };
}

function mapRate(rp: ApaleoRatePlan): MewsRate {
  return {
    Id: rp.id,
    ServiceId: rp.property?.id ?? "",
    Name: rp.name,
    ShortName: rp.code ?? null,
    IsActive: rp.isActive ?? true,
  };
}

function mapSpace(u: ApaleoUnit): MewsSpace {
  return {
    Id: u.id,
    Name: u.name,
    CategoryId: u.unitGroupId ?? null,
    State: u.status?.condition,
  };
}

function mapSpaceCategory(ug: ApaleoUnitGroup): MewsSpaceCategory {
  return {
    Id: ug.id,
    ServiceId: ug.property?.id ?? "",
    Name: ug.name,
    Capacity: ug.maxPersons,
  };
}

// ---------------------------------------------------------------------------
// Credential storage (encrypted refresh token, at rest in the hotels table)
// ---------------------------------------------------------------------------

export async function storeApaleoCredentials(
  hotelId: string,
  credentials: ApaleoCredentials
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("hotels")
    .update({
      apaleo_refresh_token_encrypted: encryptSecret(credentials.refreshToken),
      pms_type: "apaleo",
      pms_connected: true,
    })
    .eq("id", hotelId);
  if (error) {
    throw new Error(`Failed to store Apaleo credentials: ${error.message}`);
  }
}

export async function getApaleoCredentials(
  hotelId: string
): Promise<ApaleoCredentials | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hotels")
    .select("apaleo_refresh_token_encrypted")
    .eq("id", hotelId)
    .single();
  if (error) {
    throw new Error(`Failed to load Apaleo credentials: ${error.message}`);
  }
  if (!data?.apaleo_refresh_token_encrypted) return null;
  return { refreshToken: decryptSecret(data.apaleo_refresh_token_encrypted) };
}

export async function getApaleoClientForHotel(
  hotelId: string
): Promise<PmsClient | null> {
  const credentials = await getApaleoCredentials(hotelId);
  return credentials ? createApaleoClient(credentials) : null;
}
