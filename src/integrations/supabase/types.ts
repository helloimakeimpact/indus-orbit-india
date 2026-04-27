export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asks_offers: {
        Row: {
          author_id: string
          body: string
          created_at: string
          expires_at: string
          id: string
          kind: string
          region: string | null
          sector: string | null
          segment_target: Database["public"]["Enums"]["orbit_segment"][]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          expires_at?: string
          id?: string
          kind: string
          region?: string | null
          sector?: string | null
          segment_target?: Database["public"]["Enums"]["orbit_segment"][]
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          region?: string | null
          sector?: string | null
          segment_target?: Database["public"]["Enums"]["orbit_segment"][]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json
          reason: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      chapter_members: {
        Row: {
          chapter_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_members_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chapter_proposals: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          expected_size: number | null
          id: string
          proposed_name: string
          proposer_background: string
          proposer_id: string
          rationale: string
          status: string | null
          target_audience: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          expected_size?: number | null
          id?: string
          proposed_name: string
          proposer_background: string
          proposer_id: string
          rationale: string
          status?: string | null
          target_audience?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          expected_size?: number | null
          id?: string
          proposed_name?: string
          proposer_background?: string
          proposer_id?: string
          rationale?: string
          status?: string | null
          target_audience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_proposals_proposer_id_fkey"
            columns: ["proposer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chapters: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          description: string
          id?: string
          name: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      connection_requests: {
        Row: {
          created_at: string
          id: string
          note: string
          reason: string
          recipient_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          reason: string
          recipient_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          reason?: string
          recipient_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      endorsements: {
        Row: {
          created_at: string
          endorsee_id: string
          endorser_id: string
          id: string
          note: string | null
          segment: Database["public"]["Enums"]["orbit_segment"]
        }
        Insert: {
          created_at?: string
          endorsee_id: string
          endorser_id: string
          id?: string
          note?: string | null
          segment: Database["public"]["Enums"]["orbit_segment"]
        }
        Update: {
          created_at?: string
          endorsee_id?: string
          endorser_id?: string
          id?: string
          note?: string | null
          segment?: Database["public"]["Enums"]["orbit_segment"]
        }
        Relationships: []
      }
      events: {
        Row: {
          chapter_id: string | null
          created_at: string
          description: string
          end_time: string
          id: string
          link: string | null
          location: string | null
          location_type: string
          mission_id: string | null
          organizer_id: string
          start_time: string
          status: string
          title: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          description: string
          end_time: string
          id?: string
          link?: string | null
          location?: string | null
          location_type: string
          mission_id?: string | null
          organizer_id: string
          start_time: string
          status?: string
          title: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          description?: string
          end_time?: string
          id?: string
          link?: string | null
          location?: string | null
          location_type?: string
          mission_id?: string | null
          organizer_id?: string
          start_time?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      member_suspensions: {
        Row: {
          actor_id: string
          id: string
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          suspended_at: string
          user_id: string
        }
        Insert: {
          actor_id: string
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason: string
          suspended_at?: string
          user_id: string
        }
        Update: {
          actor_id?: string
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string
          suspended_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentor_sessions: {
        Row: {
          booker_id: string
          created_at: string
          duration_mins: number
          expert_id: string
          id: string
          meeting_url: string | null
          message: string
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booker_id: string
          created_at?: string
          duration_mins?: number
          expert_id: string
          id?: string
          meeting_url?: string | null
          message: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booker_id?: string
          created_at?: string
          duration_mins?: number
          expert_id?: string
          id?: string
          meeting_url?: string | null
          message?: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_sessions_booker_id_fkey"
            columns: ["booker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mentor_sessions_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mission_members: {
        Row: {
          commitment_type: string | null
          created_at: string
          message: string | null
          mission_id: string
          role: string
          user_id: string
        }
        Insert: {
          commitment_type?: string | null
          created_at?: string
          message?: string | null
          mission_id: string
          role: string
          user_id: string
        }
        Update: {
          commitment_type?: string | null
          created_at?: string
          message?: string | null
          mission_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_members_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mission_updates: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          mission_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          mission_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mission_updates_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          status: string
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          status?: string
          theme: string
          title: string
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          status?: string
          theme?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          booking_url: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          headline: string | null
          id: string
          is_public: boolean
          is_verified: boolean
          linkedin_url: string | null
          notification_prefs: Json | null
          orbit_segment: Database["public"]["Enums"]["orbit_segment"] | null
          region: string | null
          segment_details: Json
          timezone: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          booking_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          id?: string
          is_public?: boolean
          is_verified?: boolean
          linkedin_url?: string | null
          notification_prefs?: Json | null
          orbit_segment?: Database["public"]["Enums"]["orbit_segment"] | null
          region?: string | null
          segment_details?: Json
          timezone?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          booking_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          headline?: string | null
          id?: string
          is_public?: boolean
          is_verified?: boolean
          linkedin_url?: string | null
          notification_prefs?: Json | null
          orbit_segment?: Database["public"]["Enums"]["orbit_segment"] | null
          region?: string | null
          segment_details?: Json
          timezone?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolver_id: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolver_id?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolver_id?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      spotlights: {
        Row: {
          created_at: string
          featured_by: string
          id: string
          user_id: string
          writeup: string
        }
        Insert: {
          created_at?: string
          featured_by: string
          id?: string
          user_id: string
          writeup: string
        }
        Update: {
          created_at?: string
          featured_by?: string
          id?: string
          user_id?: string
          writeup?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotlights_featured_by_fkey"
            columns: ["featured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "spotlights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stories: {
        Row: {
          author_id: string
          chapter_id: string | null
          content: string
          created_at: string
          id: string
          mission_id: string | null
          published_at: string | null
          status: string
          title: string
        }
        Insert: {
          author_id: string
          chapter_id?: string | null
          content: string
          created_at?: string
          id?: string
          mission_id?: string | null
          published_at?: string | null
          status?: string
          title: string
        }
        Update: {
          author_id?: string
          chapter_id?: string | null
          content?: string
          created_at?: string
          id?: string
          mission_id?: string | null
          published_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stories_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_decisions: {
        Row: {
          actor_id: string
          created_at: string
          decision: string
          id: string
          profile_id: string
          reason: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          decision: string
          id?: string
          profile_id: string
          reason?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          decision?: string
          id?: string
          profile_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      vouch_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          issuer_id: string
          redeemed_at: string | null
          redeemer_id: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          issuer_id: string
          redeemed_at?: string | null
          redeemer_id?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          issuer_id?: string
          redeemed_at?: string | null
          redeemer_id?: string | null
          status?: string
        }
        Relationships: []
      }
      vouch_events: {
        Row: {
          channel: string
          code_id: string | null
          created_at: string
          id: string
          issuer_id: string
          recipient_id: string | null
        }
        Insert: {
          channel: string
          code_id?: string | null
          created_at?: string
          id?: string
          issuer_id: string
          recipient_id?: string | null
        }
        Update: {
          channel?: string
          code_id?: string | null
          created_at?: string
          id?: string
          issuer_id?: string
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouch_events_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "vouch_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      vouch_requests: {
        Row: {
          created_at: string
          id: string
          message: string
          requester_id: string
          responded_at: string | null
          status: string
          target_verifier_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          requester_id: string
          responded_at?: string | null
          status?: string
          target_verifier_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
          target_verifier_id?: string | null
        }
        Relationships: []
      }
      vouch_role_overrides: {
        Row: {
          id: string
          quota: number
          role: Database["public"]["Enums"]["app_role"]
          segment: Database["public"]["Enums"]["orbit_segment"] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          quota: number
          role: Database["public"]["Enums"]["app_role"]
          segment?: Database["public"]["Enums"]["orbit_segment"] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          quota?: number
          role?: Database["public"]["Enums"]["app_role"]
          segment?: Database["public"]["Enums"]["orbit_segment"] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      vouch_settings: {
        Row: {
          code_ttl_days: number
          default_quota: number
          id: string
          updated_at: string
          updated_by: string | null
          window_days: number
        }
        Insert: {
          code_ttl_days?: number
          default_quota?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
          window_days?: number
        }
        Update: {
          code_ttl_days?: number
          default_quota?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
          window_days?: number
        }
        Relationships: []
      }
      vouch_user_overrides: {
        Row: {
          quota: number
          reason: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          quota: number
          reason?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          quota?: number
          reason?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_connection_email: {
        Args: { target_user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_suspended: { Args: { _user_id: string }; Returns: boolean }
      vouch_effective_quota: { Args: { _user_id: string }; Returns: number }
      vouch_remaining: { Args: { _user_id: string }; Returns: number }
      vouch_used_in_window: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "member" | "chapter_lead" | "editor"
      orbit_segment:
        | "youth"
        | "founder"
        | "expert"
        | "investor"
        | "diaspora"
        | "partner"
        | "researcher"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "chapter_lead", "editor"],
      orbit_segment: [
        "youth",
        "founder",
        "expert",
        "investor",
        "diaspora",
        "partner",
        "researcher",
      ],
    },
  },
} as const

