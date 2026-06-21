import "server-only";

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
 * Apaleo's REST API onto Fonda's canonical (MEWS-shaped) types so downstream
 * code works with either PMS unchanged.
 *
 * Auth: OAuth2. A long-lived refresh token (obtained via the authorization-code
 * flow in /connect/apaleo/callback) is exchanged for short-lived access tokens
 * on demand.
 *
 * Entity mappings are partial and defensive — Apaleo returns more fields than
 * Fonda uses, and shapes vary slightly across API versions.
 *
 * Docs: https://apaleo.dev/
 */

const APALEO_TOKEN_URL = "https://identity.apaleo.com/connect/token";
export const APALEO_AUTHORIZE_URL =
  "https://identity.apaleo.com/connect/authorize";
const APALEO_API_BASE = "https://api.apaleo.com";
const PAGE_SIZE = 100;
const MAX_PAGES = 1000;

const DEFAULTS = {
  maxRetries: 4,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  timeoutMs: 30000,
};

export interface ApaleoCredentials {
  refreshToken: string;
}

export class ApaleoApiError extends Error {
  readonly status?: number;
  readonly endpoint?: string;

  constructor(
    message: string,
    opts: { status?: number; endpoint?: string; cause?: unknown } = {}
  ) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = "ApaleoApiError";
    this.status = opts.status;
    this.endpoint = opts.endpoint;
  }
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
    throw new ApaleoApiError(
      `Apaleo token exchange failed (${res.status}).`,
      { status: res.status, endpoint: "connect/token" }
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
      throw new ApaleoApiError(
        `Apaleo token refresh failed (${res.status}).`,
        { status: res.status, endpoint: "connect/token" }
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
    query: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(APALEO_API_BASE + path);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

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

      if (res.ok) return (await res.json()) as T;

      if ((res.status === 429 || res.status >= 500) && attempt < DEFAULTS.maxRetries) {
        const retryAfter = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : backoff(attempt));
        attempt++;
        continue;
      }

      throw new ApaleoApiError(
        `Apaleo request to ${path} failed with status ${res.status}.`,
        { status: res.status, endpoint: path }
      );
    }
  }

  /** Pages through a list endpoint, accumulating `collectionKey` across pages. */
  async function getAll<T>(
    path: string,
    collectionKey: string,
    query: Record<string, string> = {}
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

  return {
    async getReservations(startDate, endDate) {
      const rows = await getAll<ApaleoReservation>(
        "/booking/v1/reservations",
        "reservations",
        {
          dateFilter: "Stay",
          from: toApaleoDate(startDate),
          to: toApaleoDate(endDate),
        }
      );
      return rows.map(mapReservation);
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

    async getRates() {
      const rows = await getAll<ApaleoRatePlan>(
        "/rateplan/v1/rate-plans",
        "ratePlans"
      );
      return rows.map(mapRate);
    },

    async getSpaces(): Promise<MewsSpacesResult> {
      const [units, unitGroups] = await Promise.all([
        getAll<ApaleoUnit>("/inventory/v1/units", "units"),
        getAll<ApaleoUnitGroup>("/inventory/v1/unit-groups", "unitGroups"),
      ]);

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

function toApaleoDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApaleoApiError(`Invalid date passed to Apaleo client: ${String(value)}`);
  }
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
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
