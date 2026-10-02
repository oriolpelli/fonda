import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/encryption";
import type { PmsRateWindow } from "@/lib/pms";
import {
  MEWS_AVAILABILITY_METRICS,
  isPublicSellableRate,
  mapLimited,
  mewsCheapestByNight,
  mewsNightCharges,
  zonedMidnightUtc,
  type MewsAvailabilityLite,
  type MewsOrderItemLite,
  type MewsPricingLite,
  type MewsRateLite,
  type MewsRestrictionLite,
  type NightCharge,
  type NightPriceResult,
} from "@/lib/rate-math";
import { addDays } from "@/lib/occupancy";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * MEWS Connector API client.
 *
 * Every request is a POST with a JSON body that includes the auth triple
 * ({ ClientToken, AccessToken, Client }). `getAll` endpoints are cursor
 * paginated; the helpers here transparently page through all results.
 *
 * The entity interfaces below are intentionally *partial* — MEWS returns many
 * more fields than Fondas uses. Extend them as features need more data, or
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
// MEWS rejects customers/getAll outright if CustomerIds carries more than
// 1000 entries, so request guest profiles in batches of this size.
const MAX_CUSTOMER_IDS = 1000;
const MAX_PAGES = 1000; // safety cap against pathological cursor loops
// MEWS caps the reservations/getAll interval at ~100 hours. Slice wider ranges
// into chunks safely under that and merge the results.
const MAX_RESERVATION_INTERVAL_MS = 96 * 60 * 60 * 1000; // 96 hours
// orderItems/getAll takes at most 1000 ServiceOrderIds per request.
const MAX_ORDER_ITEM_IDS = 1000;
// The selling price prices every public rate once per check (about hourly).
// A hotel has a handful; the cap keeps a misconfigured one from turning the
// check into hundreds of calls. Base rates are priced first.
const MAX_PRICED_RATES = 30;
const PRICING_CONCURRENCY = 3;

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
  | "Created"
  | "Updated"
  | "Start"
  | "End";

/**
 * reservations/getAll/2023-06-06 takes one named interval per filter mode
 * instead of the legacy StartUtc/EndUtc + TimeFilter pair. Unknown request
 * properties are silently ignored by MEWS (returning *unfiltered* results), so
 * these names are verified against the API rather than assumed.
 */
const RESERVATION_INTERVAL_PARAM: Record<MewsReservationTimeFilter, string> = {
  Colliding: "CollidingUtc",
  Created: "CreatedUtc",
  Updated: "UpdatedUtc",
  Start: "ScheduledStartUtc",
  End: "ScheduledEndUtc",
};

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
  /** The guest (or company/agency — see AccountType) this reservation belongs to. */
  AccountId?: string | null;
  AccountType?: "Customer" | "Company" | "TravelAgency";
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
  getNightCharges(
    reservationIds: string[],
    window: PmsRateWindow
  ): Promise<NightCharge[]>;
  getSellingPrices(window: PmsRateWindow): Promise<NightPriceResult[]>;
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
interface OrderItemsResponse extends Paginated {
  OrderItems?: MewsOrderItemLite[];
}
/** Partial — a service. Only the accommodation ("bookable") ones matter here. */
interface MewsService {
  Id: string;
  IsActive?: boolean;
  /** Older payloads: "Reservable" for accommodation. */
  Type?: string | null;
  Data?: {
    Discriminator?: string | null;
    Value?: { TimeUnitPeriod?: string | null } | null;
  } | null;
}
interface ServicesResponse extends Paginated {
  Services?: MewsService[];
}
interface SellingRatesResponse extends Paginated {
  Rates?: (MewsRateLite & { IsBaseRate?: boolean | null })[];
}
interface RestrictionsResponse extends Paginated {
  Restrictions?: MewsRestrictionLite[];
}
type PricingResponse = Omit<MewsPricingLite, "rateId">;

/**
 * A service sold by the night. Parking and meeting rooms are "Bookable" too,
 * and hourly or monthly services can't be priced on midnight-aligned nights,
 * so the time unit has to be Day when MEWS says what it is.
 */
function isNightlyService(service: MewsService): boolean {
  if (service.IsActive === false) return false;
  const kind = service.Data?.Discriminator ?? service.Type;
  if (kind !== "Bookable" && kind !== "Reservable") return false;
  const unit = service.Data?.Value?.TimeUnitPeriod;
  return !unit || unit === "Day";
}


function parseDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new MewsApiError(`Invalid date passed to MEWS client: ${String(value)}`);
  }
  return date;
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
      // MEWS limits the request interval, so page through ≤96h chunks and merge.
      const chunks = chunkDateRange(
        parseDate(startDate),
        parseDate(endDate),
        MAX_RESERVATION_INTERVAL_MS
      );

      // Dedupe by Id — a reservation spanning a chunk boundary collides with
      // both adjacent windows under the "Colliding" filter.
      const intervalParam =
        RESERVATION_INTERVAL_PARAM[options.timeFilter ?? "Colliding"];

      const byId = new Map<string, MewsReservation>();
      for (const chunk of chunks) {
        const pages = await getAllPages<ReservationsResponse>(
          "reservations/getAll/2023-06-06",
          {
            [intervalParam]: {
              StartUtc: chunk.start.toISOString(),
              EndUtc: chunk.end.toISOString(),
            },
            ...(options.states ? { States: options.states } : {}),
          },
          credentials,
          "Reservations",
          cfg
        );
        for (const r of pages.flatMap((p) => p.Reservations ?? [])) {
          byId.set(r.Id, r);
        }
      }
      return [...byId.values()];
    },

    async getCustomers(customerIds) {
      if (customerIds.length === 0) return [];

      const customers: MewsCustomer[] = [];
      for (let i = 0; i < customerIds.length; i += MAX_CUSTOMER_IDS) {
        const pages = await getAllPages<CustomersResponse>(
          "customers/getAll",
          { CustomerIds: customerIds.slice(i, i + MAX_CUSTOMER_IDS) },
          credentials,
          "Customers",
          cfg
        );
        customers.push(...pages.flatMap((p) => p.Customers ?? []));
      }
      return customers;
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

    /**
     * Room charges for these reservations (B17). MEWS keeps a reservation's
     * charges as order items whose ServiceOrderId is the reservation id, one
     * `SpaceOrder` per night; lib/rate-math.ts picks those out and places
     * each on its night.
     */
    async getNightCharges(reservationIds, window) {
      const ids = [...new Set(reservationIds.filter(Boolean))];
      const items: MewsOrderItemLite[] = [];
      for (let i = 0; i < ids.length; i += MAX_ORDER_ITEM_IDS) {
        const pages = await getAllPages<OrderItemsResponse>(
          "orderItems/getAll",
          { ServiceOrderIds: ids.slice(i, i + MAX_ORDER_ITEM_IDS) },
          credentials,
          "OrderItems",
          cfg
        );
        items.push(...pages.flatMap((p) => p.OrderItems ?? []));
      }
      const wanted = new Set(window.nights);
      return mewsNightCharges(items, window.timezone).filter((c) =>
        wanted.has(c.night)
      );
    },

    /**
     * The lowest public price on sale each night (B17): every public rate of
     * the hotel's room service, priced per room type, minus the room types
     * with no room left and the rates a restriction closes for a guest
     * booking now. Five kinds of call — services, rates, one pricing call per
     * public rate, restrictions, availability — which is why the sync runs
     * this about hourly, and with one retry and a 10 s timeout per call
     * rather than the sync's four and 30 s: a slow answer here is worth less
     * than the reservations sync it would hold up.
     *
     * Which service: the one the sync says most stays belong to. Without that
     * hint (no stays in the fortnight), the hotel's only nightly bookable
     * service — and if it has several, the answer is "can't tell" ([]).
     */
    async getSellingPrices(window) {
      const quick: Required<MewsRetryOptions> = {
        ...cfg,
        maxRetries: 1,
        timeoutMs: 10_000,
      };
      const { nights, timezone } = window;
      if (nights.length === 0) return [];
      const now = new Date();
      const first = zonedMidnightUtc(timezone, nights[0]).toISOString();
      const last = zonedMidnightUtc(
        timezone,
        nights[nights.length - 1]
      ).toISOString();
      const end = zonedMidnightUtc(
        timezone,
        addDays(nights[nights.length - 1], 1)
      ).toISOString();

      let serviceIds = window.serviceIds?.filter(Boolean) ?? [];
      if (serviceIds.length === 0) {
        const servicePages = await getAllPages<ServicesResponse>(
          "services/getAll",
          {},
          credentials,
          "Services",
          quick
        );
        const nightly = servicePages
          .flatMap((p) => p.Services ?? [])
          .filter(isNightlyService)
          .map((s) => s.Id);
        if (nightly.length !== 1) return [];
        serviceIds = nightly;
      }

      const ratePages = await getAllPages<SellingRatesResponse>(
        "rates/getAll",
        { ServiceIds: serviceIds },
        credentials,
        "Rates",
        quick
      );
      const rates = ratePages
        .flatMap((p) => p.Rates ?? [])
        .filter(isPublicSellableRate)
        .sort((a, b) => Number(Boolean(b.IsBaseRate)) - Number(Boolean(a.IsBaseRate)))
        .slice(0, MAX_PRICED_RATES);
      if (rates.length === 0) return [];

      const [pricing, restrictionPages, availability] = await Promise.all([
        mapLimited(rates, PRICING_CONCURRENCY, async (rate) => ({
          rateId: rate.Id,
          ...(await mewsRequest<PricingResponse>(
            "rates/getPricing",
            {
              RateId: rate.Id,
              FirstTimeUnitStartUtc: first,
              LastTimeUnitStartUtc: last,
            },
            credentials,
            quick
          )),
        })),
        getAllPages<RestrictionsResponse>(
          "restrictions/getAll",
          {
            ServiceIds: serviceIds,
            CollidingUtc: { StartUtc: first, EndUtc: end },
          },
          credentials,
          "Restrictions",
          quick
        ),
        Promise.all(
          serviceIds.map((serviceId) =>
            mewsRequest<MewsAvailabilityLite>(
              "services/getAvailability/2024-01-22",
              {
                ServiceId: serviceId,
                FirstTimeUnitStartUtc: first,
                LastTimeUnitStartUtc: last,
                Metrics: [...MEWS_AVAILABILITY_METRICS],
              },
              credentials,
              quick
            )
          )
        ),
      ]);

      return mewsCheapestByNight({
        tz: timezone,
        nights,
        rates,
        pricing,
        restrictions: restrictionPages.flatMap((p) => p.Restrictions ?? []),
        availability,
        now,
      });
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
