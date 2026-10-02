import "server-only";

import { createHash } from "node:crypto";

import * as Sentry from "@sentry/nextjs";

import type {
  MewsCustomer,
  MewsReservation,
  GetReservationsOptions,
} from "@/lib/mews";
import { getPmsClientForHotel } from "@/lib/pms";
import { syncRates } from "@/lib/rate-sync";
import { migrationApplied } from "@/lib/schema-features";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/paged";
import type { Json, TablesInsert } from "@/types/database";

/**
 * Thin sync layer: pull MEWS reservations (and the guest profiles they
 * reference) into Supabase. MEWS stays the source of truth; these tables are a
 * fast local cache the rest of the app reads from.
 *
 * Writes go through the service-role admin client, so they bypass RLS — keep
 * this module server-only.
 */

const UPSERT_BATCH = 500;

export interface SyncResult {
  reservations: number;
  customers: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * The guest profile this reservation belongs to. AccountId also carries
 * company and travel-agency ids, which have no matching customers/getAll row.
 */
function guestId(r: MewsReservation): string | null {
  if (r.AccountType && r.AccountType !== "Customer") return null;
  return r.AccountId ?? null;
}

function reservationRow(
  hotelId: string,
  r: MewsReservation,
  syncedAt: string
): TablesInsert<"reservations"> {
  return {
    hotel_id: hotelId,
    mews_id: r.Id,
    service_id: r.ServiceId ?? null,
    group_id: r.GroupId ?? null,
    number: r.Number ?? null,
    state: r.State ?? null,
    customer_mews_id: guestId(r),
    requested_category_id: r.RequestedCategoryId ?? null,
    assigned_space_id: r.AssignedSpaceId ?? null,
    rate_id: r.RateId ?? null,
    start_utc: r.StartUtc ?? null,
    end_utc: r.EndUtc ?? null,
    adult_count: r.AdultCount ?? null,
    child_count: r.ChildCount ?? null,
    raw: r as unknown as Json,
    mews_updated_utc: r.UpdatedUtc ?? null,
    synced_at: syncedAt,
  };
}

function customerRow(
  hotelId: string,
  c: MewsCustomer,
  syncedAt: string
): TablesInsert<"customers"> {
  return {
    hotel_id: hotelId,
    mews_id: c.Id,
    first_name: c.FirstName ?? null,
    last_name: c.LastName ?? null,
    email: c.Email ?? null,
    phone: c.Phone ?? null,
    nationality_code: c.NationalityCode ?? null,
    language_code: c.LanguageCode ?? null,
    raw: c as unknown as Json,
    mews_updated_utc: c.UpdatedUtc ?? null,
    synced_at: syncedAt,
  };
}

/**
 * A row's content, fingerprinted: everything the PMS gave us, and none of our
 * own bookkeeping. `synced_at` changes on every run, so it is left out, or no
 * row would ever look unchanged.
 */
function contentHash(row: { synced_at?: string | null }): string {
  const { synced_at: _syncedAt, ...content } = row;
  void _syncedAt;
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

interface StoredHash {
  mews_id: string;
  content_hash: string | null;
}

/**
 * The rows that are new or whose content changed, each with its hash.
 *
 * Until 1 Oct every run rewrote every row in the window — today ±14 days of
 * reservations and every guest they reference, each with its full PMS payload
 * — every 15 minutes, changed or not. In production that was 97% of the
 * database's time, and on a 0.5 GB instance the I/O it caused stalled every
 * dashboard read behind it (docs/audits/2026-10-01-S3-speed-pass-c.md). Each
 * row now carries a hash of its content (migration 0029); a run reads the
 * stored hashes and skips every row whose hash matches. A row written before
 * 0029 has no hash, so the first run after it writes everything once.
 *
 * Without 0029 applied (lib/schema-features.ts) every row is returned, with
 * no hash, exactly as before.
 *
 * `inWindow` reads the stored hashes in bulk. `byIds` looks up whatever that
 * missed — a stay whose dates moved, or one the PMS counts as in the window by
 * a slightly different rule — so it isn't rewritten on every run for that.
 */
async function changedRows<R extends { mews_id: string; synced_at?: string | null }>(
  rows: R[],
  inWindow: () => Promise<StoredHash[]>,
  byIds: (ids: string[]) => Promise<StoredHash[]>
): Promise<(R & { content_hash?: string })[]> {
  if (rows.length === 0 || !(await migrationApplied("0029"))) return rows;

  const stored = new Map(
    (await inWindow()).map((r) => [r.mews_id, r.content_hash])
  );
  const missing = rows.map((r) => r.mews_id).filter((id) => !stored.has(id));
  if (missing.length > 0) {
    for (const r of await byIds(missing)) stored.set(r.mews_id, r.content_hash);
  }

  const changed: (R & { content_hash: string })[] = [];
  for (const row of rows) {
    const hash = contentHash(row);
    if (stored.get(row.mews_id) !== hash) changed.push({ ...row, content_hash: hash });
  }
  return changed;
}

interface WriteCount {
  written: number;
  unchanged: number;
}

async function upsertReservations(
  hotelId: string,
  rows: TablesInsert<"reservations">[],
  window: { start: string; end: string }
): Promise<WriteCount> {
  const admin = createAdminClient();
  const toWrite = await changedRows(
    rows,
    // The same window the PMS was asked for, in pages: a handful of small
    // reads rather than one per id.
    () =>
      fetchAllPages<StoredHash>((from, to) =>
        admin
          .from("reservations")
          .select("mews_id, content_hash")
          .eq("hotel_id", hotelId)
          .lt("start_utc", window.end)
          .gt("end_utc", window.start)
          .order("mews_id", { ascending: true })
          .range(from, to)
      ),
    (ids) =>
      fetchInChunks<StoredHash>(ids, (chunk) =>
        admin
          .from("reservations")
          .select("mews_id, content_hash")
          .eq("hotel_id", hotelId)
          .in("mews_id", chunk)
      )
  );
  for (const batch of chunk(toWrite, UPSERT_BATCH)) {
    const { error } = await admin
      .from("reservations")
      .upsert(batch, { onConflict: "hotel_id,mews_id" });
    if (error) {
      throw new Error(`Failed to upsert reservations: ${error.message}`);
    }
  }
  return { written: toWrite.length, unchanged: rows.length - toWrite.length };
}

async function upsertCustomers(
  hotelId: string,
  rows: TablesInsert<"customers">[]
): Promise<WriteCount> {
  const admin = createAdminClient();
  const lookup = (ids: string[]) =>
    fetchInChunks<StoredHash>(ids, (chunk) =>
      admin
        .from("customers")
        .select("mews_id, content_hash")
        .eq("hotel_id", hotelId)
        .in("mews_id", chunk)
    );
  // Customers have no window of their own: the ids are the window, so the
  // bulk read already covers every row and there is nothing left to look up.
  const toWrite = await changedRows(
    rows,
    () => lookup(rows.map((r) => r.mews_id)),
    async () => []
  );
  for (const batch of chunk(toWrite, UPSERT_BATCH)) {
    const { error } = await admin
      .from("customers")
      .upsert(batch, { onConflict: "hotel_id,mews_id" });
    if (error) {
      throw new Error(`Failed to upsert customers: ${error.message}`);
    }
  }
  return { written: toWrite.length, unchanged: rows.length - toWrite.length };
}

/** Fetches the given customers from MEWS and upserts them into Supabase. */
export async function syncCustomers(
  hotelId: string,
  customerIds: string[]
): Promise<number> {
  const ids = [...new Set(customerIds.filter(Boolean))];
  if (ids.length === 0) return 0;

  const pms = await getPmsClientForHotel(hotelId);
  if (!pms) {
    throw new Error(`Hotel ${hotelId} is not connected to a PMS.`);
  }

  const customers = await pms.getCustomers(ids);
  const syncedAt = new Date().toISOString();
  await upsertCustomers(
    hotelId,
    customers.map((c) => customerRow(hotelId, c, syncedAt))
  );
  return customers.length;
}

/** What one pull fetched, for the rate step that runs after it's logged. */
interface PullResult {
  result: SyncResult;
  pms: NonNullable<Awaited<ReturnType<typeof getPmsClientForHotel>>>;
  reservations: MewsReservation[];
}

async function pullReservations(
  hotelId: string,
  startDate: string | Date,
  endDate: string | Date,
  options?: GetReservationsOptions
): Promise<PullResult> {
  const pms = await getPmsClientForHotel(hotelId);
  if (!pms) {
    throw new Error(`Hotel ${hotelId} is not connected to a PMS.`);
  }

  const reservations = await pms.getReservations(startDate, endDate, options);
  const syncedAt = new Date().toISOString();

  const reservationWrites = await upsertReservations(
    hotelId,
    reservations.map((r) => reservationRow(hotelId, r, syncedAt)),
    {
      start: new Date(startDate).toISOString(),
      end: new Date(endDate).toISOString(),
    }
  );

  // Pull the guest profiles referenced by these reservations.
  const customerIds = reservations
    .map(guestId)
    .filter((id): id is string => Boolean(id));

  let customers = 0;
  let customerWrites: WriteCount = { written: 0, unchanged: 0 };
  if (customerIds.length > 0) {
    const ids = [...new Set(customerIds)];
    const profiles = await pms.getCustomers(ids);
    customerWrites = await upsertCustomers(
      hotelId,
      profiles.map((c) => customerRow(hotelId, c, syncedAt))
    );
    customers = profiles.length;
  }

  // Counts only — what the run wrote against what it skipped as unchanged.
  // No hotel, no guest: just whether the change-only write is working.
  console.log(
    `[sync] reservations ${reservationWrites.written} written, ${reservationWrites.unchanged} unchanged; customers ${customerWrites.written} written, ${customerWrites.unchanged} unchanged`
  );

  return {
    result: { reservations: reservations.length, customers },
    pms,
    reservations,
  };
}

/**
 * Pulls all reservations colliding with [startDate, endDate] into Supabase,
 * then pulls the guest profiles those reservations reference. Returns the
 * number of rows synced for each.
 */
export async function syncReservations(
  hotelId: string,
  startDate: string | Date,
  endDate: string | Date,
  options?: GetReservationsOptions
): Promise<SyncResult> {
  return (await pullReservations(hotelId, startDate, endDate, options)).result;
}

/**
 * The rate cache (B17), from the reservations a pull just fetched. Runs after
 * the pull is stored AND logged, so a slow or failing PMS rate call can never
 * cost a hotel its "synced at" or its sync log. Only a full fetch of every
 * stay touching the window can count rooms, so a pull filtered by state or by
 * another time rule is left out. Never throws.
 */
async function syncRatesAfter(
  hotelId: string,
  pull: PullResult,
  startDate: string | Date,
  endDate: string | Date,
  options?: GetReservationsOptions
): Promise<void> {
  const fullFetch =
    !options?.states &&
    (!options?.timeFilter || options.timeFilter === "Colliding");
  if (!fullFetch) return;
  try {
    await syncRates({
      hotelId,
      pms: pull.pms,
      reservations: pull.reservations,
      windowStart: new Date(startDate),
      windowEnd: new Date(endDate),
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { hotelId, stage: "rates" } });
  }
}

/**
 * Syncs one hotel and records the outcome: writes a row to `sync_logs` and, on
 * success, stamps `hotels.last_synced_at`. Errors are logged and rethrown so
 * callers can decide how to react.
 */
export async function syncHotel(
  hotelId: string,
  startDate: string | Date,
  endDate: string | Date,
  options?: GetReservationsOptions
): Promise<SyncResult> {
  const admin = createAdminClient();
  const startedAt = new Date().toISOString();

  let pull: PullResult;
  try {
    pull = await pullReservations(hotelId, startDate, endDate, options);
    const result = pull.result;
    const finishedAt = new Date().toISOString();

    await admin.from("sync_logs").insert({
      hotel_id: hotelId,
      status: "success",
      reservations_count: result.reservations,
      customers_count: result.customers,
      started_at: startedAt,
      finished_at: finishedAt,
    });
    await admin
      .from("hotels")
      .update({ last_synced_at: finishedAt })
      .eq("id", hotelId);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { hotelId, stage: "sync" },
    });
    await admin.from("sync_logs").insert({
      hotel_id: hotelId,
      status: "error",
      error: (err as Error).message,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
    throw err;
  }

  // Logged and stamped; now the rate cache, which can't undo either.
  await syncRatesAfter(hotelId, pull, startDate, endDate, options);
  return pull.result;
}

export interface HotelSyncOutcome {
  hotelId: string;
  result?: SyncResult;
  error?: string;
}

/**
 * Syncs every hotel that has MEWS connected. Used by the scheduled cron. Runs
 * sequentially (one hotel at a time) to stay gentle on MEWS rate limits, and
 * isolates failures so one hotel's error doesn't abort the rest.
 */
export async function syncAllConnectedHotels(
  startDate: string | Date,
  endDate: string | Date,
  options?: GetReservationsOptions
): Promise<HotelSyncOutcome[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hotels")
    .select("id")
    .eq("pms_connected", true);

  if (error) {
    const listError = new Error(
      `Failed to list connected hotels: ${error.message}`
    );
    Sentry.captureException(listError, { tags: { stage: "sync" } });
    throw listError;
  }

  const outcomes: HotelSyncOutcome[] = [];
  for (const { id } of data ?? []) {
    try {
      const result = await syncHotel(id, startDate, endDate, options);
      outcomes.push({ hotelId: id, result });
    } catch (err) {
      outcomes.push({ hotelId: id, error: (err as Error).message });
    }
  }
  return outcomes;
}
