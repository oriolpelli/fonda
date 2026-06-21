/**
 * Shared domain types for Fonda — a hotel operations SaaS for independent
 * hotel GMs (20–200 rooms).
 *
 * Database-backed types are derived from the generated schema in
 * `./database.ts`, so they stay in sync with `supabase/migrations`. App-level
 * types that aren't persisted (product surfaces, PMS reservations) are defined
 * here.
 */

import type { Enums, Tables } from "./database";

export type { Database, Json } from "./database";
export { Constants } from "./database";
export type { Tables, TablesInsert, TablesUpdate, Enums } from "./database";

// --- Row aliases (one per table) -------------------------------------------

export type Hotel = Tables<"hotels">;
/** App profile row (1:1 with `auth.users`); not the Supabase auth user. */
export type UserProfile = Tables<"users">;
export type Briefing = Tables<"briefings">;
export type Email = Tables<"emails">;
export type CheckinChaser = Tables<"checkin_chasers">;
export type HotelSettings = Tables<"hotel_settings">;
/** Locally cached MEWS reservation (synced by lib/mews-sync.ts). */
export type Reservation = Tables<"reservations">;
/** Locally cached MEWS guest profile (synced by lib/mews-sync.ts). */
export type Customer = Tables<"customers">;
/** A record of one PMS sync run. */
export type SyncLog = Tables<"sync_logs">;

// --- Enum aliases ----------------------------------------------------------

export type UserRole = Enums<"user_role">;
export type EmailStatus = Enums<"email_status">;
export type ChaserStatus = Enums<"chaser_status">;

// --- App-level types (not persisted in the database) -----------------------

/** The Fonda product surfaces, used to drive dashboard navigation. */
export type FeatureKey =
  | "briefing"
  | "email-assistant"
  | "checkin-chasing"
  | "hotel-chat";

export interface Feature {
  key: FeatureKey;
  name: string;
  description: string;
  href: string;
}
