import "server-only";

import {
  getMewsClientForHotel,
  type MewsCustomer,
  type MewsReservation,
  type GetReservationsOptions,
} from "@/lib/mews";
import { createAdminClient } from "@/lib/supabase/admin";
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
    customer_mews_id: r.AccountId ?? null,
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

async function upsertReservations(
  rows: TablesInsert<"reservations">[]
): Promise<void> {
  const admin = createAdminClient();
  for (const batch of chunk(rows, UPSERT_BATCH)) {
    const { error } = await admin
      .from("reservations")
      .upsert(batch, { onConflict: "hotel_id,mews_id" });
    if (error) {
      throw new Error(`Failed to upsert reservations: ${error.message}`);
    }
  }
}

async function upsertCustomers(
  rows: TablesInsert<"customers">[]
): Promise<void> {
  const admin = createAdminClient();
  for (const batch of chunk(rows, UPSERT_BATCH)) {
    const { error } = await admin
      .from("customers")
      .upsert(batch, { onConflict: "hotel_id,mews_id" });
    if (error) {
      throw new Error(`Failed to upsert customers: ${error.message}`);
    }
  }
}

/** Fetches the given customers from MEWS and upserts them into Supabase. */
export async function syncCustomers(
  hotelId: string,
  customerIds: string[]
): Promise<number> {
  const ids = [...new Set(customerIds.filter(Boolean))];
  if (ids.length === 0) return 0;

  const mews = await getMewsClientForHotel(hotelId);
  if (!mews) {
    throw new Error(`Hotel ${hotelId} is not connected to MEWS.`);
  }

  const customers = await mews.getCustomers(ids);
  const syncedAt = new Date().toISOString();
  await upsertCustomers(customers.map((c) => customerRow(hotelId, c, syncedAt)));
  return customers.length;
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
  const mews = await getMewsClientForHotel(hotelId);
  if (!mews) {
    throw new Error(`Hotel ${hotelId} is not connected to MEWS.`);
  }

  const reservations = await mews.getReservations(startDate, endDate, options);
  const syncedAt = new Date().toISOString();

  await upsertReservations(
    reservations.map((r) => reservationRow(hotelId, r, syncedAt))
  );

  // Pull the guest profiles referenced by these reservations.
  const customerIds = reservations
    .map((r) => r.AccountId)
    .filter((id): id is string => Boolean(id));

  let customers = 0;
  if (customerIds.length > 0) {
    const ids = [...new Set(customerIds)];
    const profiles = await mews.getCustomers(ids);
    await upsertCustomers(
      profiles.map((c) => customerRow(hotelId, c, syncedAt))
    );
    customers = profiles.length;
  }

  return { reservations: reservations.length, customers };
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
    throw new Error(`Failed to list connected hotels: ${error.message}`);
  }

  const outcomes: HotelSyncOutcome[] = [];
  for (const { id } of data ?? []) {
    try {
      const result = await syncReservations(id, startDate, endDate, options);
      outcomes.push({ hotelId: id, result });
    } catch (err) {
      outcomes.push({ hotelId: id, error: (err as Error).message });
    }
  }
  return outcomes;
}
