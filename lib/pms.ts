import "server-only";

import { getApaleoClientForHotel } from "@/lib/apaleo";
import { getMewsClientForHotel } from "@/lib/mews";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PMS-agnostic contract. Fonda supports multiple property management systems
 * (MEWS, Apaleo); every client maps its native API onto these canonical types
 * so downstream code (sync, briefings, chat) works with any PMS unchanged.
 *
 * The canonical shapes are the MEWS client's output types — they were defined
 * first and the sync layer already maps from them — re-exported here under
 * PMS-neutral names. New PMS clients must produce these exact shapes.
 */
export type {
  MewsReservation as PmsReservation,
  MewsCustomer as PmsCustomer,
  MewsRate as PmsRate,
  MewsSpace as PmsSpace,
  MewsSpaceCategory as PmsSpaceCategory,
  MewsSpaceCategoryAssignment as PmsSpaceCategoryAssignment,
  MewsSpacesResult as PmsSpacesResult,
  MewsReservationState as PmsReservationState,
  GetReservationsOptions,
  GetRatesOptions,
} from "@/lib/mews";

import type {
  MewsReservation,
  MewsCustomer,
  MewsRate,
  MewsSpacesResult,
  GetReservationsOptions,
  GetRatesOptions,
} from "@/lib/mews";

export type PmsType = "mews" | "apaleo";

/** The capabilities every PMS client exposes, with identical output types. */
export interface PmsClient {
  getReservations(
    startDate: string | Date,
    endDate: string | Date,
    options?: GetReservationsOptions
  ): Promise<MewsReservation[]>;
  getCustomers(customerIds: string[]): Promise<MewsCustomer[]>;
  getRates(options?: GetRatesOptions): Promise<MewsRate[]>;
  getSpaces(): Promise<MewsSpacesResult>;
}

/**
 * Returns a ready-to-use PMS client for a hotel, dispatching on its configured
 * `pms_type`. Null if the hotel has no PMS connected.
 */
export async function getPmsClientForHotel(
  hotelId: string
): Promise<PmsClient | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hotels")
    .select("pms_type")
    .eq("id", hotelId)
    .single();

  switch (data?.pms_type) {
    case "mews":
      return getMewsClientForHotel(hotelId);
    case "apaleo":
      return getApaleoClientForHotel(hotelId);
    default:
      return null;
  }
}
