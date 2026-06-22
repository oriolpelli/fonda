import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/encryption";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * MEWS Connector API client.
 *
 * Every request is a POST with a JSON body that includes the auth triple
 * ({ ClientToken, AccessToken, Client }). `getAll` endpoints are cursor
 * paginated; the helpers here transparently page through all results.
 *
 * The entity interfaces below are intentionally *partial* — MEWS returns many
 * more fields than Fonda uses. Extend them as features need more data, or
 * regenerate from MEWS's published schema.
 *
 * Docs: https://mews-systems.gitbook.io/connector-api/
 */

// Base origin for the MEWS Connector API. Override with MEWS_API_URL to point
// at the demo environment (https://api.mews-demo.com) or a pilot's region. The
// connector path is always appended, so MEWS_API_URL holds just the origin.
const MEWS_BASE_URL = `${(
  process.env.MEWS_API_URL ?? "https://api.mews.com"
).replace(/\/+$/, "")}/api/connector/v1/`;
const MEWS_CLIENT = "Fonda_v1";
const PAGE_SIZE = 1000; // MEWS max Count per page
const MAX_PAGES = 1000; // safety cap against pathological cursor loops

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface MewsCredentials {
  clientToken: string;
  accessToken: string;
}

export interface MewsRetryOptions {
  /** Max retry attempts for 429 / 5xx / network errors. Default 4. */
  maxRetries?: number;
  /** Base backoff in ms (grows exponentially with jitter). Default 500. */
  baseDelayMs?: number;
  /** Backoff ceiling in ms. Default 8000. */
  maxDelayMs?: number;
  /** Per-request timeout in ms. Default 30000. */
  timeoutMs?: number;
}

export type MewsReservationState =
  | "Enquired"
  | "Requested"
  | "Optional"
  | "Confirmed"
  | "Started"
  | "Processed"
  | "Canceled";

/** How the [StartUtc, EndUtc] window is applied to reservations. */
export type MewsReservationTimeFilter =
  | "Colliding"
  | "Overlapping"
  | "Created"
  | "Updated"
  | "Start"
  | "End";

/** Partial — a guest stay/reservation. */
export interface MewsReservation {
  Id: string;
  ServiceId: string;
  GroupId?: string;
  Number?: string;
  State: MewsReservationState;
  Origin?: string;
  StartUtc: string;
  EndUtc: string;
  CreatedUtc?: string;
  UpdatedUtc?: string;
  CancelledUtc?: string | null;
  RequestedCategoryId?: string | null;
  AssignedSpaceId?: string | null;
  AccountId?: string | null;
  RateId?: string | null;
  AdultCount?: number;
  ChildCount?: number;
}

/** Partial — a guest profile. */
export interface MewsCustomer {
  Id: string;
  FirstName?: string | null;
  LastName?: string | null;
  Email?: string | null;
  Phone?: string | null;
  Title?: string | null;
  NationalityCode?: string | null;
  LanguageCode?: string | null;
  BirthDate?: string | null;
  CreatedUtc?: string;
  UpdatedUtc?: string;
}

/** Partial — a rate plan. */
export interface MewsRate {
  Id: string;
  GroupId?: string;
  BaseRateId?: string | null;
  ServiceId: string;
  Name?: string;
  ShortName?: string | null;
  ExternalIdentifier?: string | null;
  IsActive?: boolean;
  IsEnabled?: boolean;
  CreatedUtc?: string;
  UpdatedUtc?: string;
}

/** Partial — an individual bookable room. */
export interface MewsSpace {
  Id: string;
  Name?: string;
  CategoryId?: string | null;
  ParentSpaceId?: string | null;
  State?: string;
  FloorNumber?: string | null;
}

/** Partial — a room type / category. */
export interface MewsSpaceCategory {
  Id: string;
  ServiceId: string;
  IsActive?: boolean;
  Name?: string;
  ShortName?: string | null;
  Names?: Record<string, string>;
  Capacity?: number;
  ExtraCapacity?: number;
}

/** Links a space (room) to its category (room type). */
export interface MewsSpaceCategoryAssignment {
  Id: string;
  CategoryId: string;
  SpaceId: string;
}

export interface MewsSpacesResult {
  spaces: MewsSpace[];
  spaceCategories: MewsSpaceCategory[];
  assignments: MewsSpaceCategoryAssignment[];
}

/** Partial — the enterprise (property) configuration. Used to validate tokens. */
export interface MewsConfiguration {
  Enterprise?: {
    Id: string;
    Name?: string;
    DefaultLanguageCode?: string;
    TimeZoneIdentifier?: string;
  };
}

export interface GetReservationsOptions {
  timeFilter?: MewsReservationTimeFilter;
  states?: MewsReservationState[];
}

export interface GetRatesOptions {
  serviceIds?: string[];
  rateGroupIds?: string[];
}

export interface MewsClient {
  getReservations(
    startDate: string | Date,
    endDate: string | Date,
    options?: GetReservationsOptions
  ): Promise<MewsReservation[]>;
  getCustomers(customerIds: string[]): Promise<MewsCustomer[]>;
  getRates(options?: GetRatesOptions): Promise<MewsRate[]>;
  getSpaces(): Promise<MewsSpacesResult>;
  getConfiguration(): Promise<MewsConfiguration>;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class MewsApiError extends Error {
  readonly status?: number;
  readonly requestId?: string;
  readonly details?: string;
  readonly endpoint?: string;

  constructor(
    message: string,
    opts: {
      status?: number;
      requestId?: string;
      details?: string;
      endpoint?: string;
      cause?: unknown;
    } = {}
  ) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = "MewsApiError";
    this.status = opts.status;
    this.requestId = opts.requestId;
    this.details = opts.details;
    this.endpoint = opts.endpoint;
  }
}

interface MewsErrorBody {
  Message?: string;
  Details?: string;
  RequestId?: string;
}

// ---------------------------------------------------------------------------
// Low-level request with retry/backoff
// ---------------------------------------------------------------------------

const DEFAULTS = {
  maxRetries: 4,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  timeoutMs: 30000,
} satisfies Required<MewsRetryOptions>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Exponential backoff with full jitter. */
function backoff(attempt: number, cfg: Required<MewsRetryOptions>): number {
  const ceiling = Math.min(cfg.maxDelayMs, cfg.baseDelayMs * 2 ** attempt);
  return Math.random() * ceiling;
}

/** Parses a Retry-After header (delta-seconds) into ms, if present and numeric. */
function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function mewsRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  credentials: MewsCredentials,
  cfg: Required<MewsRetryOptions>
): Promise<T> {
  const url = MEWS_BASE_URL + endpoint;
  const payload = JSON.stringify({
    ClientToken: credentials.clientToken,
    AccessToken: credentials.accessToken,
    Client: MEWS_CLIENT,
    ...body,
  });

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: controller.signal,
      });
    } catch (err) {
      // Network failure or timeout abort — retry while attempts remain.
      if (attempt < cfg.maxRetries) {
        await sleep(backoff(attempt, cfg));
        attempt++;
        continue;
      }
      throw new MewsApiError(
        `Network error calling MEWS ${endpoint}: ${(err as Error).message}`,
        { endpoint, cause: err }
      );
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) {
      return (await res.json()) as T;
    }

    const isRetryable = res.status === 429 || res.status >= 500;
    if (isRetryable && attempt < cfg.maxRetries) {
      const wait =
        parseRetryAfter(res.headers.get("retry-after")) ?? backoff(attempt, cfg);
      await sleep(wait);
      attempt++;
      continue;
    }

    const errorBody = await safeJson<MewsErrorBody>(res);
    throw new MewsApiError(
      errorBody?.Message ??
        `MEWS request to ${endpoint} failed with status ${res.status}`,
      {
        status: res.status,
        requestId: errorBody?.RequestId,
        details: errorBody?.Details,
        endpoint,
      }
    );
  }
}

// ---------------------------------------------------------------------------
// Cursor pagination
// ---------------------------------------------------------------------------

interface Paginated {
  Cursor?: string | null;
}

/**
 * Walks every page of a `getAll` endpoint, returning the raw page responses so
 * the caller can flat-map whichever collection(s) it needs. `primaryKey` names
 * the main array used to detect the end of the result set.
 */
async function getAllPages<T extends Paginated>(
  endpoint: string,
  body: Record<string, unknown>,
  credentials: MewsCredentials,
  primaryKey: keyof T,
  cfg: Required<MewsRetryOptions>
): Promise<T[]> {
  const pages: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  for (let i = 0; i < MAX_PAGES; i++) {
    const limitation = cursor
      ? { Count: PAGE_SIZE, Cursor: cursor }
      : { Count: PAGE_SIZE };

    const page = await mewsRequest<T>(
      endpoint,
      { ...body, Limitation: limitation },
      credentials,
      cfg
    );
    pages.push(page);

    const rows = page[primaryKey];
    const next = page.Cursor ?? undefined;

    // Stop when there's no further cursor, the page is empty, or the cursor
    // stops advancing (defensive guard against a misbehaving endpoint).
    if (!next) break;
    if (Array.isArray(rows) && rows.length === 0) break;
    if (seenCursors.has(next)) break;

    seenCursors.add(next);
    cursor = next;
  }

  return pages;
}

// ---------------------------------------------------------------------------
// Per-endpoint response envelopes
// ---------------------------------------------------------------------------

interface ReservationsResponse extends Paginated {
  Reservations?: MewsReservation[];
}
interface CustomersResponse extends Paginated {
  Customers?: MewsCustomer[];
}
interface RatesResponse extends Paginated {
  Rates?: MewsRate[];
}
interface SpacesResponse extends Paginated {
  Spaces?: MewsSpace[];
  SpaceCategories?: MewsSpaceCategory[];
  SpaceCategoryAssignments?: MewsSpaceCategoryAssignment[];
}

function toUtc(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new MewsApiError(`Invalid date passed to MEWS client: ${String(value)}`);
  }
  return date.toISOString();
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

/**
 * Creates a MEWS client bound to a hotel's credentials. Prefer
 * {@link getMewsClientForHotel}, which loads and decrypts the tokens for you.
 */
export function createMewsClient(
  credentials: MewsCredentials,
  retryOptions: MewsRetryOptions = {}
): MewsClient {
  const cfg: Required<MewsRetryOptions> = { ...DEFAULTS, ...retryOptions };

  return {
    async getReservations(startDate, endDate, options = {}) {
      const pages = await getAllPages<ReservationsResponse>(
        "reservations/getAll",
        {
          StartUtc: toUtc(startDate),
          EndUtc: toUtc(endDate),
          TimeFilter: options.timeFilter ?? "Colliding",
          ...(options.states ? { ReservationStates: options.states } : {}),
          Extent: { Reservations: true },
        },
        credentials,
        "Reservations",
        cfg
      );
      return pages.flatMap((p) => p.Reservations ?? []);
    },

    async getCustomers(customerIds) {
      if (customerIds.length === 0) return [];
      const pages = await getAllPages<CustomersResponse>(
        "customers/getAll",
        { CustomerIds: customerIds },
        credentials,
        "Customers",
        cfg
      );
      return pages.flatMap((p) => p.Customers ?? []);
    },

    async getRates(options = {}) {
      const pages = await getAllPages<RatesResponse>(
        "rates/getAll",
        {
          ...(options.serviceIds ? { ServiceIds: options.serviceIds } : {}),
          ...(options.rateGroupIds ? { RateGroupIds: options.rateGroupIds } : {}),
        },
        credentials,
        "Rates",
        cfg
      );
      return pages.flatMap((p) => p.Rates ?? []);
    },

    async getSpaces() {
      const pages = await getAllPages<SpacesResponse>(
        "spaces/getAll",
        {},
        credentials,
        "Spaces",
        cfg
      );
      return {
        spaces: pages.flatMap((p) => p.Spaces ?? []),
        spaceCategories: pages.flatMap((p) => p.SpaceCategories ?? []),
        assignments: pages.flatMap((p) => p.SpaceCategoryAssignments ?? []),
      };
    },

    async getConfiguration() {
      return mewsRequest<MewsConfiguration>(
        "configuration/get",
        {},
        credentials,
        cfg
      );
    },
  };
}

/**
 * Validates a credential pair against MEWS by fetching the enterprise
 * configuration. Resolves if the tokens are accepted; throws a
 * {@link MewsApiError} otherwise.
 */
export async function verifyMewsCredentials(
  credentials: MewsCredentials
): Promise<MewsConfiguration> {
  return createMewsClient(credentials).getConfiguration();
}

// ---------------------------------------------------------------------------
// Credential storage (encrypted at rest in the hotels table)
// ---------------------------------------------------------------------------

/** Encrypts and stores a hotel's MEWS tokens, marking the PMS as connected. */
export async function storeMewsCredentials(
  hotelId: string,
  credentials: MewsCredentials
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("hotels")
    .update({
      mews_client_token_encrypted: encryptSecret(credentials.clientToken),
      mews_access_token_encrypted: encryptSecret(credentials.accessToken),
      pms_type: "mews",
      pms_connected: true,
    })
    .eq("id", hotelId);

  if (error) {
    throw new Error(`Failed to store MEWS credentials: ${error.message}`);
  }
}

/** Loads and decrypts a hotel's MEWS tokens. Returns null if none are stored. */
export async function getMewsCredentials(
  hotelId: string
): Promise<MewsCredentials | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hotels")
    .select("mews_client_token_encrypted, mews_access_token_encrypted")
    .eq("id", hotelId)
    .single();

  if (error) {
    throw new Error(`Failed to load MEWS credentials: ${error.message}`);
  }
  if (!data?.mews_client_token_encrypted || !data?.mews_access_token_encrypted) {
    return null;
  }

  return {
    clientToken: decryptSecret(data.mews_client_token_encrypted),
    accessToken: decryptSecret(data.mews_access_token_encrypted),
  };
}

/** Convenience: a ready-to-use MEWS client for a hotel, or null if unconnected. */
export async function getMewsClientForHotel(
  hotelId: string,
  retryOptions?: MewsRetryOptions
): Promise<MewsClient | null> {
  const credentials = await getMewsCredentials(hotelId);
  return credentials ? createMewsClient(credentials, retryOptions) : null;
}
