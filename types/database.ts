/**
 * Database types for Fonda.
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
      hotel_settings: {
        Row: {
          id: string;
          hotel_id: string;
          briefing_time: string;
          briefing_language: string;
          gm_name: string | null;
          arrival_instructions: string | null;
          tone_guidelines: string | null;
        };
        Insert: {
          id?: string;
          hotel_id: string;
          briefing_time?: string;
          briefing_language?: string;
          gm_name?: string | null;
          arrival_instructions?: string | null;
          tone_guidelines?: string | null;
        };
        Update: {
          id?: string;
          hotel_id?: string;
          briefing_time?: string;
          briefing_language?: string;
          gm_name?: string | null;
          arrival_instructions?: string | null;
          tone_guidelines?: string | null;
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
        };
        Returns: string;
      };
    };
    Enums: {
      chaser_status: "pending" | "sent" | "replied";
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
      chaser_status: ["pending", "sent", "replied"],
      email_status: ["pending", "sent", "ignored", "needs_attention"],
      user_role: ["owner", "manager"],
    },
  },
} as const;
