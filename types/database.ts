/**
 * Database types for Fondas.
 *
 * Mirrors `supabase/migrations/0001_init.sql` in the shape produced by
 * `supabase gen types typescript --local`. Regenerate with that command once
 * the Supabase CLI is wired up, or keep this in sync by hand when the schema
 * changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      hotels: {
        Row: {
          id: string;
          name: string;
          rooms_count: number;
          timezone: string;
          pms_type: string | null;
          pms_connected: boolean;
          created_at: string;
          last_synced_at: string | null;
          // Server-only: clients lack column privileges (see migrations 0002, 0006).
          mews_client_token_encrypted: string | null;
          mews_access_token_encrypted: string | null;
          apaleo_refresh_token_encrypted: string | null;
          sheet_url_encrypted: string | null;
          gmail_refresh_token_encrypted: string | null;
          gmail_email: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          rooms_count: number;
          timezone?: string;
          pms_type?: string | null;
          pms_connected?: boolean;
          created_at?: string;
          last_synced_at?: string | null;
          mews_client_token_encrypted?: string | null;
          mews_access_token_encrypted?: string | null;
          apaleo_refresh_token_encrypted?: string | null;
          sheet_url_encrypted?: string | null;
          gmail_refresh_token_encrypted?: string | null;
          gmail_email?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          rooms_count?: number;
          timezone?: string;
          pms_type?: string | null;
          pms_connected?: boolean;
          created_at?: string;
          last_synced_at?: string | null;
          mews_client_token_encrypted?: string | null;
          mews_access_token_encrypted?: string | null;
          apaleo_refresh_token_encrypted?: string | null;
          sheet_url_encrypted?: string | null;
          gmail_refresh_token_encrypted?: string | null;
          gmail_email?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          hotel_id: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string;
        };
        Insert: {
          id: string;
          hotel_id: string;
          email: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      briefings: {
        Row: {
          id: string;
          hotel_id: string;
          content_json: Json;
          generated_at: string;
          delivered_at: string | null;
          opened_at: string | null;
        };
        Insert: {
          id?: string;
          hotel_id: string;
          content_json?: Json;
          generated_at?: string;
          delivered_at?: string | null;
          opened_at?: string | null;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          content_json?: Json;
          generated_at?: string;
          delivered_at?: string | null;
          opened_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "briefings_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      emails: {
        Row: {
          id: string;
          hotel_id: string;
          external_id: string | null;
          from_email: string | null;
          subject: string | null;
          body: string | null;
          classification: string | null;
          draft_reply: string | null;
          status: Database["public"]["Enums"]["email_status"];
          created_at: string;
          sent_at: string | null;
          reservation_mews_id: string | null;
          customer_mews_id: string | null;
        };
        Insert: {
          id?: string;
          hotel_id: string;
          external_id?: string | null;
          from_email?: string | null;
          subject?: string | null;
          body?: string | null;
          classification?: string | null;
          draft_reply?: string | null;
          status?: Database["public"]["Enums"]["email_status"];
          created_at?: string;
          sent_at?: string | null;
          reservation_mews_id?: string | null;
          customer_mews_id?: string | null;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          external_id?: string | null;
          from_email?: string | null;
          subject?: string | null;
          body?: string | null;
          classification?: string | null;
          draft_reply?: string | null;
          status?: Database["public"]["Enums"]["email_status"];
          created_at?: string;
          sent_at?: string | null;
          reservation_mews_id?: string | null;
          customer_mews_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "emails_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      checkin_chasers: {
        Row: {
          id: string;
          hotel_id: string;
          reservation_id: string | null;
          guest_email: string | null;
          draft_content: string | null;
          status: Database["public"]["Enums"]["chaser_status"];
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          hotel_id: string;
          reservation_id?: string | null;
          guest_email?: string | null;
          draft_content?: string | null;
          status?: Database["public"]["Enums"]["chaser_status"];
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          reservation_id?: string | null;
          guest_email?: string | null;
          draft_content?: string | null;
          status?: Database["public"]["Enums"]["chaser_status"];
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkin_chasers_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          id: string;
          hotel_id: string;
          mews_id: string;
          service_id: string | null;
          group_id: string | null;
          number: string | null;
          state: string | null;
          customer_mews_id: string | null;
          requested_category_id: string | null;
          assigned_space_id: string | null;
          rate_id: string | null;
          start_utc: string | null;
          end_utc: string | null;
          adult_count: number | null;
          child_count: number | null;
          arrival_time: string | null;
          raw: Json;
          mews_updated_utc: string | null;
          synced_at: string;
        };
        Insert: {
          id?: string;
          hotel_id: string;
          mews_id: string;
          service_id?: string | null;
          group_id?: string | null;
          number?: string | null;
          state?: string | null;
          customer_mews_id?: string | null;
          requested_category_id?: string | null;
          assigned_space_id?: string | null;
          rate_id?: string | null;
          start_utc?: string | null;
          end_utc?: string | null;
          adult_count?: number | null;
          child_count?: number | null;
          arrival_time?: string | null;
          raw?: Json;
          mews_updated_utc?: string | null;
          synced_at?: string;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          mews_id?: string;
          service_id?: string | null;
          group_id?: string | null;
          number?: string | null;
          state?: string | null;
          customer_mews_id?: string | null;
          requested_category_id?: string | null;
          assigned_space_id?: string | null;
          rate_id?: string | null;
          start_utc?: string | null;
          end_utc?: string | null;
          adult_count?: number | null;
          child_count?: number | null;
          arrival_time?: string | null;
          raw?: Json;
          mews_updated_utc?: string | null;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          hotel_id: string;
          mews_id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          nationality_code: string | null;
          language_code: string | null;
          raw: Json;
          mews_updated_utc: string | null;
          synced_at: string;
        };
        Insert: {
          id?: string;
          hotel_id: string;
          mews_id: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          nationality_code?: string | null;
          language_code?: string | null;
          raw?: Json;
          mews_updated_utc?: string | null;
          synced_at?: string;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          mews_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          nationality_code?: string | null;
          language_code?: string | null;
          raw?: Json;
          mews_updated_utc?: string | null;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_logs: {
        Row: {
          id: string;
          hotel_id: string;
          status: string;
          reservations_count: number;
          customers_count: number;
          error: string | null;
          started_at: string;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          hotel_id: string;
          status: string;
          reservations_count?: number;
          customers_count?: number;
          error?: string | null;
          started_at?: string;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          status?: string;
          reservations_count?: number;
          customers_count?: number;
          error?: string | null;
          started_at?: string;
          finished_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sync_logs_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      cron_logs: {
        Row: {
          id: string;
          job: string;
          hotel_id: string | null;
          status: string;
          message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job: string;
          hotel_id?: string | null;
          status: string;
          message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job?: string;
          hotel_id?: string | null;
          status?: string;
          message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cron_logs_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      // Marketing newsletter list (migration 0016, extended by 0021). No
      // hotel_id: these rows belong to members of the public, not to a hotel,
      // so RLS denies every client and only the service_role key reaches them.
      // `source` separates footer newsletter signups from sample-brief leads.
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          status: string;
          locale: string;
          confirm_token_hash: string | null;
          unsubscribe_token_hash: string | null;
          confirm_sent_at: string | null;
          confirmed_at: string | null;
          unsubscribed_at: string | null;
          created_at: string;
          source: string;
          hotel_name: string | null;
          first_name: string | null;
          sample_requested_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          status?: string;
          locale?: string;
          confirm_token_hash?: string | null;
          unsubscribe_token_hash?: string | null;
          confirm_sent_at?: string | null;
          confirmed_at?: string | null;
          unsubscribed_at?: string | null;
          created_at?: string;
          source?: string;
          hotel_name?: string | null;
          first_name?: string | null;
          sample_requested_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          status?: string;
          locale?: string;
          confirm_token_hash?: string | null;
          unsubscribe_token_hash?: string | null;
          confirm_sent_at?: string | null;
          confirmed_at?: string | null;
          unsubscribed_at?: string | null;
          created_at?: string;
          source?: string;
          hotel_name?: string | null;
          first_name?: string | null;
          sample_requested_at?: string | null;
        };
        Relationships: [];
      };
      draft_edit_events: {
        Row: {
          id: string;
          hotel_id: string;
          surface: string;
          edit_bucket: string;
          similarity_pct: number;
          bulk: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          hotel_id: string;
          surface: string;
          edit_bucket: string;
          similarity_pct: number;
          bulk?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          surface?: string;
          edit_bucket?: string;
          similarity_pct?: number;
          bulk?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "draft_edit_events_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_logs: {
        Row: {
          id: string;
          hotel_id: string;
          role: string;
          /** Pseudonymised at rest — see lib/pseudonymise.ts. */
          content: string;
          created_at: string;
          /** Null for every row written before migration 0023. */
          thread_id: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          hotel_id: string;
          role: string;
          content: string;
          created_at?: string;
          thread_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          role?: string;
          content?: string;
          created_at?: string;
          thread_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_logs_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      guest_profiles: {
        Row: {
          hotel_id: string;
          customer_mews_id: string;
          trip_purpose: string | null;
          occasion: string | null;
          /** [{ text, source, at }] — see lib/guests.ts GuestPreference. */
          preferences: Json;
          /** Staff-written. Inference never writes this column. */
          notes: string | null;
          inferred_at: string | null;
          last_stay_end: string | null;
          updated_at: string;
        };
        Insert: {
          hotel_id: string;
          customer_mews_id: string;
          trip_purpose?: string | null;
          occasion?: string | null;
          preferences?: Json;
          notes?: string | null;
          inferred_at?: string | null;
          last_stay_end?: string | null;
          updated_at?: string;
        };
        Update: {
          hotel_id?: string;
          customer_mews_id?: string;
          trip_purpose?: string | null;
          occasion?: string | null;
          preferences?: Json;
          notes?: string | null;
          inferred_at?: string | null;
          last_stay_end?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guest_profiles_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_threads: {
        Row: {
          id: string;
          hotel_id: string;
          user_id: string;
          title: string | null;
          created_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          hotel_id: string;
          user_id: string;
          title?: string | null;
          created_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          user_id?: string;
          title?: string | null;
          created_at?: string;
          last_message_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_threads_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_threads_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      hotel_settings: {
        Row: {
          id: string;
          hotel_id: string;
          briefing_time: string;
          briefing_language: string;
          default_locale: string;
          gm_name: string | null;
          arrival_instructions: string | null;
          tone_guidelines: string | null;
          star_rating: number | null;
          property_type: string | null;
          check_in_time: string | null;
          check_out_time: string | null;
          policies: string | null;
          positioning_vibe: string | null;
          target_guest: string | null;
          local_recommendations: string | null;
          preferred_greeting: string | null;
          signoff_name: string | null;
          languages_spoken: string | null;
          tripadvisor_url: string | null;
          review_highlights: string | null;
          review_summary: string | null;
          parking_transport: string | null;
          wifi_info: string | null;
          breakfast_info: string | null;
          room_types: Json;
          brief_recipients: Json;
          brief_send_hour: number;
          upsells: Json;
        };
        Insert: {
          id?: string;
          hotel_id: string;
          briefing_time?: string;
          briefing_language?: string;
          default_locale?: string;
          gm_name?: string | null;
          arrival_instructions?: string | null;
          tone_guidelines?: string | null;
          star_rating?: number | null;
          property_type?: string | null;
          check_in_time?: string | null;
          check_out_time?: string | null;
          policies?: string | null;
          positioning_vibe?: string | null;
          target_guest?: string | null;
          local_recommendations?: string | null;
          preferred_greeting?: string | null;
          signoff_name?: string | null;
          languages_spoken?: string | null;
          tripadvisor_url?: string | null;
          review_highlights?: string | null;
          review_summary?: string | null;
          parking_transport?: string | null;
          wifi_info?: string | null;
          breakfast_info?: string | null;
          room_types?: Json;
          brief_recipients?: Json;
          brief_send_hour?: number;
          upsells?: Json;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          briefing_time?: string;
          briefing_language?: string;
          default_locale?: string;
          gm_name?: string | null;
          arrival_instructions?: string | null;
          tone_guidelines?: string | null;
          star_rating?: number | null;
          property_type?: string | null;
          check_in_time?: string | null;
          check_out_time?: string | null;
          policies?: string | null;
          positioning_vibe?: string | null;
          target_guest?: string | null;
          local_recommendations?: string | null;
          preferred_greeting?: string | null;
          signoff_name?: string | null;
          languages_spoken?: string | null;
          tripadvisor_url?: string | null;
          review_highlights?: string | null;
          review_summary?: string | null;
          parking_transport?: string | null;
          wifi_info?: string | null;
          breakfast_info?: string | null;
          room_types?: Json;
          brief_recipients?: Json;
          brief_send_hour?: number;
          upsells?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "hotel_settings_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: true;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
      dashboard_layouts: {
        Row: {
          user_id: string;
          hotel_id: string;
          /** Ordered array of {key, enabled}; see lib/home-layout.ts. */
          widgets: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          hotel_id: string;
          widgets: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          hotel_id?: string;
          widgets?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dashboard_layouts_hotel_id_fkey";
            columns: ["hotel_id"];
            isOneToOne: false;
            referencedRelation: "hotels";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      current_hotel_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      provision_hotel: {
        Args: {
          p_user_id: string;
          p_email: string;
          p_hotel_name: string;
          p_rooms_count: number;
          p_timezone: string;
          p_pms_type: string;
          /** en/es/ca. Optional in SQL (defaults to 'en'); see migration 0020. */
          p_locale?: string;
        };
        Returns: string;
      };
      draft_acceptance_summary: {
        Args: {
          p_hotel_id: string;
          p_from: string;
          p_to: string;
        };
        // Postgres `bigint` and `numeric` arrive as strings over PostgREST;
        // lib/draft-acceptance.ts is what coerces them to numbers.
        Returns: {
          total: number;
          accepted: number;
          none_count: number;
          minor_count: number;
          major_count: number;
          bulk_count: number;
          considered_total: number;
          considered_accepted: number;
          acceptance_rate: number | null;
          considered_acceptance_rate: number | null;
        }[];
      };
      draft_acceptance_rolling: {
        Args: {
          p_hotel_id: string;
          p_from: string;
          p_to: string;
          p_window_days?: number;
        };
        Returns: {
          day: string;
          day_total: number;
          day_accepted: number;
          window_total: number;
          window_accepted: number;
          acceptance_rate: number | null;
        }[];
      };
    };
    Enums: {
      chaser_status: "pending" | "sent" | "replied" | "skipped";
      email_status: "pending" | "sent" | "ignored" | "needs_attention";
      user_role: "owner" | "manager";
    };
    CompositeTypes: Record<never, never>;
  };
};

// ---------------------------------------------------------------------------
// Convenience helpers (same ergonomics as the generated `supabase gen types`).
// ---------------------------------------------------------------------------

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];

/** Runtime access to enum values (e.g. for building <select> options). */
export const Constants = {
  public: {
    Enums: {
      chaser_status: ["pending", "sent", "replied", "skipped"],
      email_status: ["pending", "sent", "ignored", "needs_attention"],
      user_role: ["owner", "manager"],
    },
  },
} as const;
