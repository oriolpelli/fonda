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
        };
        Insert: {
          id?: string;
          name: string;
          rooms_count: number;
          timezone?: string;
          pms_type?: string | null;
          pms_connected?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          rooms_count?: number;
          timezone?: string;
          pms_type?: string | null;
          pms_connected?: boolean;
          created_at?: string;
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
