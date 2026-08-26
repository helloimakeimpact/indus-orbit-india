export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      asks_offers: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          expires_at: string;
          id: string;
          kind: string;
          region: string | null;
          sector: string | null;
          segment_target: Database["public"]["Enums"]["orbit_segment"][];
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          kind: string;
          region?: string | null;
          sector?: string | null;
          segment_target?: Database["public"]["Enums"]["orbit_segment"][];
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          kind?: string;
          region?: string | null;
          sector?: string | null;
          segment_target?: Database["public"]["Enums"]["orbit_segment"][];
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          reason: string | null;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          reason?: string | null;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          reason?: string | null;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
      chapter_members: {
        Row: {
          chapter_id: string;
          client_request_id: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          invited_by: string | null;
          left_at: string | null;
          membership_state: string;
          removal_reason: string | null;
          request_message: string | null;
          requested_at: string | null;
          role: string;
          state_version: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          chapter_id: string;
          client_request_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          invited_by?: string | null;
          left_at?: string | null;
          membership_state?: string;
          removal_reason?: string | null;
          request_message?: string | null;
          requested_at?: string | null;
          role?: string;
          state_version?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          client_request_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          invited_by?: string | null;
          left_at?: string | null;
          membership_state?: string;
          removal_reason?: string | null;
          request_message?: string | null;
          requested_at?: string | null;
          role?: string;
          state_version?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapter_members_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapter_members_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "chapter_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "chapter_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      chapter_proposals: {
        Row: {
          approved_chapter_id: string | null;
          city: string | null;
          client_request_id: string | null;
          country: string | null;
          country_code: string | null;
          created_at: string | null;
          decision_reason: string | null;
          expected_size: number | null;
          id: string;
          join_policy: string;
          place_id: string | null;
          proposed_name: string;
          proposed_stewards: Json;
          proposer_background: string;
          proposer_id: string;
          rationale: string;
          region_id: string | null;
          requested_information: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          state_version: number;
          status: string | null;
          submitted_at: string | null;
          target_audience: string | null;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          approved_chapter_id?: string | null;
          city?: string | null;
          client_request_id?: string | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string | null;
          decision_reason?: string | null;
          expected_size?: number | null;
          id?: string;
          join_policy?: string;
          place_id?: string | null;
          proposed_name: string;
          proposed_stewards?: Json;
          proposer_background: string;
          proposer_id: string;
          rationale: string;
          region_id?: string | null;
          requested_information?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          state_version?: number;
          status?: string | null;
          submitted_at?: string | null;
          target_audience?: string | null;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          approved_chapter_id?: string | null;
          city?: string | null;
          client_request_id?: string | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string | null;
          decision_reason?: string | null;
          expected_size?: number | null;
          id?: string;
          join_policy?: string;
          place_id?: string | null;
          proposed_name?: string;
          proposed_stewards?: Json;
          proposer_background?: string;
          proposer_id?: string;
          rationale?: string;
          region_id?: string | null;
          requested_information?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          state_version?: number;
          status?: string | null;
          submitted_at?: string | null;
          target_audience?: string | null;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapter_proposals_approved_chapter_id_fkey";
            columns: ["approved_chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapter_proposals_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "geo_countries";
            referencedColumns: ["country_code"];
          },
          {
            foreignKeyName: "chapter_proposals_place_id_fkey";
            columns: ["place_id"];
            isOneToOne: false;
            referencedRelation: "geo_places";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapter_proposals_proposer_id_fkey";
            columns: ["proposer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "chapter_proposals_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "geo_regions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapter_proposals_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      chapters: {
        Row: {
          activated_at: string | null;
          archived_at: string | null;
          city: string | null;
          client_request_id: string | null;
          country: string | null;
          country_code: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          join_policy: string;
          lifecycle_state: string;
          name: string;
          paused_at: string | null;
          place_id: string | null;
          region_id: string | null;
          source_proposal_id: string | null;
          state_version: number;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          activated_at?: string | null;
          archived_at?: string | null;
          city?: string | null;
          client_request_id?: string | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          description: string;
          id?: string;
          join_policy?: string;
          lifecycle_state?: string;
          name: string;
          paused_at?: string | null;
          place_id?: string | null;
          region_id?: string | null;
          source_proposal_id?: string | null;
          state_version?: number;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          activated_at?: string | null;
          archived_at?: string | null;
          city?: string | null;
          client_request_id?: string | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          join_policy?: string;
          lifecycle_state?: string;
          name?: string;
          paused_at?: string | null;
          place_id?: string | null;
          region_id?: string | null;
          source_proposal_id?: string | null;
          state_version?: number;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapters_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "geo_countries";
            referencedColumns: ["country_code"];
          },
          {
            foreignKeyName: "chapters_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "chapters_place_id_fkey";
            columns: ["place_id"];
            isOneToOne: false;
            referencedRelation: "geo_places";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapters_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "geo_regions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapters_source_proposal_id_fkey";
            columns: ["source_proposal_id"];
            isOneToOne: false;
            referencedRelation: "chapter_proposals";
            referencedColumns: ["id"];
          },
        ];
      };
      connection_requests: {
        Row: {
          client_request_id: string | null;
          created_at: string;
          id: string;
          note: string;
          reason: string;
          recipient_id: string;
          responded_at: string | null;
          sender_id: string;
          status: string;
        };
        Insert: {
          client_request_id?: string | null;
          created_at?: string;
          id?: string;
          note: string;
          reason: string;
          recipient_id: string;
          responded_at?: string | null;
          sender_id: string;
          status?: string;
        };
        Update: {
          client_request_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string;
          reason?: string;
          recipient_id?: string;
          responded_at?: string | null;
          sender_id?: string;
          status?: string;
        };
        Relationships: [];
      };
      contact_submissions: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          role: string;
          source: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          role?: string;
          source?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          role?: string;
          source?: string;
        };
        Relationships: [];
      };
      conversation_attachments: {
        Row: {
          alt_text: string | null;
          byte_size: number;
          content_sha256: string | null;
          content_type: string;
          created_at: string;
          file_name: string;
          id: string;
          message_id: string;
          review_note: string | null;
          review_version: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          scan_finished_at: string | null;
          scan_provider: string | null;
          scan_started_at: string | null;
          scan_status: string;
          scanner_reference: string | null;
          storage_bucket: string;
          storage_path: string;
          threat_code: string | null;
          uploaded_by: string;
        };
        Insert: {
          alt_text?: string | null;
          byte_size: number;
          content_sha256?: string | null;
          content_type: string;
          created_at?: string;
          file_name: string;
          id?: string;
          message_id: string;
          review_note?: string | null;
          review_version?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          scan_finished_at?: string | null;
          scan_provider?: string | null;
          scan_started_at?: string | null;
          scan_status?: string;
          scanner_reference?: string | null;
          storage_bucket: string;
          storage_path: string;
          threat_code?: string | null;
          uploaded_by: string;
        };
        Update: {
          alt_text?: string | null;
          byte_size?: number;
          content_sha256?: string | null;
          content_type?: string;
          created_at?: string;
          file_name?: string;
          id?: string;
          message_id?: string;
          review_note?: string | null;
          review_version?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          scan_finished_at?: string | null;
          scan_provider?: string | null;
          scan_started_at?: string | null;
          scan_status?: string;
          scanner_reference?: string | null;
          storage_bucket?: string;
          storage_path?: string;
          threat_code?: string | null;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      conversation_bookmarks: {
        Row: {
          created_at: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_bookmarks_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_bookmarks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      conversation_context_groups: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          position: number;
          space_id: string;
          system_key: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id?: string;
          position?: number;
          space_id: string;
          system_key: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          position?: number;
          space_id?: string;
          system_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_context_groups_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "conversation_spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_mentions: {
        Row: {
          created_at: string;
          id: string;
          mentioned_role_id: string | null;
          mentioned_user_id: string | null;
          message_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mentioned_role_id?: string | null;
          mentioned_user_id?: string | null;
          message_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          mentioned_role_id?: string | null;
          mentioned_user_id?: string | null;
          message_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_mentions_mentioned_role_id_fkey";
            columns: ["mentioned_role_id"];
            isOneToOne: false;
            referencedRelation: "conversation_space_roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_mentions_mentioned_user_id_fkey";
            columns: ["mentioned_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_mentions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_message_revisions: {
        Row: {
          id: string;
          message_id: string;
          previous_content: string;
          revised_at: string;
          revised_by: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          previous_content: string;
          revised_at?: string;
          revised_by: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          previous_content?: string;
          revised_at?: string;
          revised_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_message_revisions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_message_revisions_revised_by_fkey";
            columns: ["revised_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      conversation_messages: {
        Row: {
          author_id: string;
          client_request_id: string | null;
          content: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          message_type: string;
          provenance: Json;
          reply_to_message_id: string | null;
          room_id: string;
          thread_id: string | null;
        };
        Insert: {
          author_id: string;
          client_request_id?: string | null;
          content: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          message_type?: string;
          provenance?: Json;
          reply_to_message_id?: string | null;
          room_id: string;
          thread_id?: string | null;
        };
        Update: {
          author_id?: string;
          client_request_id?: string | null;
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          message_type?: string;
          provenance?: Json;
          reply_to_message_id?: string | null;
          room_id?: string;
          thread_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_messages_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_messages_reply_to_message_id_fkey";
            columns: ["reply_to_message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_messages_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "conversation_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "conversation_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_moderation_appeals: {
        Row: {
          appellant_id: string;
          assigned_to: string | null;
          client_request_id: string;
          decided_at: string | null;
          decided_by: string | null;
          decision_note: string | null;
          id: string;
          notice_id: string;
          reason: string;
          status: string;
          submitted_at: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          appellant_id: string;
          assigned_to?: string | null;
          client_request_id: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          id?: string;
          notice_id: string;
          reason: string;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          appellant_id?: string;
          assigned_to?: string | null;
          client_request_id?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          id?: string;
          notice_id?: string;
          reason?: string;
          status?: string;
          submitted_at?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_moderation_appeals_appellant_id_fkey";
            columns: ["appellant_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_moderation_appeals_notice_id_fkey";
            columns: ["notice_id"];
            isOneToOne: true;
            referencedRelation: "conversation_moderation_notices";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_moderation_notices: {
        Row: {
          action_type: string;
          appeal_deadline: string;
          created_at: string;
          id: string;
          moderation_action_id: string;
          reason_summary: string;
          reversed_at: string | null;
          target_id: string;
          target_type: string;
          target_user_id: string;
        };
        Insert: {
          action_type: string;
          appeal_deadline: string;
          created_at?: string;
          id?: string;
          moderation_action_id: string;
          reason_summary: string;
          reversed_at?: string | null;
          target_id: string;
          target_type: string;
          target_user_id: string;
        };
        Update: {
          action_type?: string;
          appeal_deadline?: string;
          created_at?: string;
          id?: string;
          moderation_action_id?: string;
          reason_summary?: string;
          reversed_at?: string | null;
          target_id?: string;
          target_type?: string;
          target_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_moderation_notices_target_user_id_fkey";
            columns: ["target_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      conversation_notification_preferences: {
        Row: {
          id: string;
          preference: string;
          quiet_hours: Json;
          room_id: string | null;
          space_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          preference?: string;
          quiet_hours?: Json;
          room_id?: string | null;
          space_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          preference?: string;
          quiet_hours?: Json;
          room_id?: string | null;
          space_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_notification_preferences_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "conversation_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_notification_preferences_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "conversation_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      conversation_pins: {
        Row: {
          message_id: string;
          pinned_at: string;
          pinned_by: string;
          room_id: string;
        };
        Insert: {
          message_id: string;
          pinned_at?: string;
          pinned_by: string;
          room_id: string;
        };
        Update: {
          message_id?: string;
          pinned_at?: string;
          pinned_by?: string;
          room_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_pins_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_pins_pinned_by_fkey";
            columns: ["pinned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_pins_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "conversation_rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_reactions: {
        Row: {
          created_at: string;
          message_id: string;
          reaction_key: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          message_id: string;
          reaction_key: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          message_id?: string;
          reaction_key?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_reactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      conversation_read_states: {
        Row: {
          last_read_at: string;
          last_read_message_id: string | null;
          room_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          last_read_at?: string;
          last_read_message_id?: string | null;
          room_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          last_read_at?: string;
          last_read_message_id?: string | null;
          room_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_read_states_last_read_message_id_fkey";
            columns: ["last_read_message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_read_states_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "conversation_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_read_states_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      conversation_reports: {
        Row: {
          category: string;
          client_request_id: string | null;
          created_at: string;
          description: string;
          id: string;
          message_id: string | null;
          reporter_id: string;
          room_id: string | null;
          space_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          client_request_id?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          message_id?: string | null;
          reporter_id: string;
          room_id?: string | null;
          space_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          client_request_id?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          message_id?: string | null;
          reporter_id?: string;
          room_id?: string | null;
          space_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_reports_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_reports_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "conversation_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_reports_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "conversation_spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_room_permission_overrides: {
        Row: {
          capability: string;
          created_at: string;
          created_by: string;
          effect: string;
          id: string;
          role_id: string | null;
          room_id: string;
          user_id: string | null;
        };
        Insert: {
          capability: string;
          created_at?: string;
          created_by: string;
          effect: string;
          id?: string;
          role_id?: string | null;
          room_id: string;
          user_id?: string | null;
        };
        Update: {
          capability?: string;
          created_at?: string;
          created_by?: string;
          effect?: string;
          id?: string;
          role_id?: string | null;
          room_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_room_permission_overrides_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_room_permission_overrides_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "conversation_space_roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_room_permission_overrides_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "conversation_rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_room_permission_overrides_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      conversation_rooms: {
        Row: {
          archived_at: string | null;
          context_group_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          display_name: string;
          id: string;
          position: number;
          posting_policy: string;
          room_type: string;
          space_id: string;
          system_key: string;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          archived_at?: string | null;
          context_group_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          display_name: string;
          id?: string;
          position?: number;
          posting_policy?: string;
          room_type: string;
          space_id: string;
          system_key: string;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          archived_at?: string | null;
          context_group_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          display_name?: string;
          id?: string;
          position?: number;
          posting_policy?: string;
          room_type?: string;
          space_id?: string;
          system_key?: string;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_rooms_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_rooms_space_id_context_group_id_fkey";
            columns: ["space_id", "context_group_id"];
            isOneToOne: false;
            referencedRelation: "conversation_context_groups";
            referencedColumns: ["space_id", "id"];
          },
          {
            foreignKeyName: "conversation_rooms_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "conversation_spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_space_memberships: {
        Row: {
          domain_role: string;
          joined_at: string | null;
          left_at: string | null;
          membership_state: string;
          source_membership_version: number;
          space_id: string;
          synced_at: string;
          user_id: string;
        };
        Insert: {
          domain_role: string;
          joined_at?: string | null;
          left_at?: string | null;
          membership_state: string;
          source_membership_version?: number;
          space_id: string;
          synced_at?: string;
          user_id: string;
        };
        Update: {
          domain_role?: string;
          joined_at?: string | null;
          left_at?: string | null;
          membership_state?: string;
          source_membership_version?: number;
          space_id?: string;
          synced_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_space_memberships_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "conversation_spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_space_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      conversation_space_role_members: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          role_id: string;
          space_id: string;
          user_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          role_id: string;
          space_id: string;
          user_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          role_id?: string;
          space_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_space_role_members_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_space_role_members_space_id_role_id_fkey";
            columns: ["space_id", "role_id"];
            isOneToOne: false;
            referencedRelation: "conversation_space_roles";
            referencedColumns: ["space_id", "id"];
          },
          {
            foreignKeyName: "conversation_space_role_members_space_id_user_id_fkey";
            columns: ["space_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "conversation_space_memberships";
            referencedColumns: ["space_id", "user_id"];
          },
        ];
      };
      conversation_space_roles: {
        Row: {
          capabilities: string[];
          created_at: string;
          display_name: string;
          id: string;
          is_system: boolean;
          position: number;
          space_id: string;
          system_key: string;
        };
        Insert: {
          capabilities?: string[];
          created_at?: string;
          display_name: string;
          id?: string;
          is_system?: boolean;
          position?: number;
          space_id: string;
          system_key: string;
        };
        Update: {
          capabilities?: string[];
          created_at?: string;
          display_name?: string;
          id?: string;
          is_system?: boolean;
          position?: number;
          space_id?: string;
          system_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_space_roles_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "conversation_spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_spaces: {
        Row: {
          archived_at: string | null;
          blueprint_key: string;
          blueprint_version: number;
          chapter_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          display_name: string;
          id: string;
          join_policy: string;
          lifecycle_state: string;
          mission_id: string | null;
          source_type: string;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          archived_at?: string | null;
          blueprint_key: string;
          blueprint_version?: number;
          chapter_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          display_name: string;
          id?: string;
          join_policy?: string;
          lifecycle_state?: string;
          mission_id?: string | null;
          source_type: string;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          archived_at?: string | null;
          blueprint_key?: string;
          blueprint_version?: number;
          chapter_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          display_name?: string;
          id?: string;
          join_policy?: string;
          lifecycle_state?: string;
          mission_id?: string | null;
          source_type?: string;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_spaces_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: true;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_spaces_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_spaces_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: true;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_thread_members: {
        Row: {
          added_at: string;
          added_by: string | null;
          left_at: string | null;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          added_by?: string | null;
          left_at?: string | null;
          thread_id: string;
          user_id: string;
        };
        Update: {
          added_at?: string;
          added_by?: string | null;
          left_at?: string | null;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_thread_members_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_thread_members_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "conversation_threads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_thread_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      conversation_threads: {
        Row: {
          archived_at: string | null;
          client_request_id: string | null;
          created_at: string;
          created_by: string;
          id: string;
          locked_at: string | null;
          parent_message_id: string | null;
          room_id: string;
          title: string | null;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          archived_at?: string | null;
          client_request_id?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          locked_at?: string | null;
          parent_message_id?: string | null;
          room_id: string;
          title?: string | null;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          archived_at?: string | null;
          client_request_id?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          locked_at?: string | null;
          parent_message_id?: string | null;
          room_id?: string;
          title?: string | null;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_threads_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversation_threads_parent_message_id_fkey";
            columns: ["parent_message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_threads_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "conversation_rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      course_modules: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          sort_order: number;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          sort_order?: number;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          chapter_id: string | null;
          cover_url: string | null;
          created_at: string;
          created_by: string;
          id: string;
          published_at: string | null;
          slug: string;
          sort_order: number;
          status: string;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          chapter_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          published_at?: string | null;
          slug: string;
          sort_order?: number;
          status?: string;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          chapter_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          published_at?: string | null;
          slug?: string;
          sort_order?: number;
          status?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          client_request_id: string | null;
          content: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Insert: {
          client_request_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Update: {
          client_request_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_id?: string;
          sender_id?: string;
        };
        Relationships: [];
      };
      endorsements: {
        Row: {
          created_at: string;
          endorsee_id: string;
          endorser_id: string;
          id: string;
          note: string | null;
          segment: Database["public"]["Enums"]["orbit_segment"];
        };
        Insert: {
          created_at?: string;
          endorsee_id: string;
          endorser_id: string;
          id?: string;
          note?: string | null;
          segment: Database["public"]["Enums"]["orbit_segment"];
        };
        Update: {
          created_at?: string;
          endorsee_id?: string;
          endorser_id?: string;
          id?: string;
          note?: string | null;
          segment?: Database["public"]["Enums"]["orbit_segment"];
        };
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          note: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          note?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          note?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          chapter_id: string | null;
          created_at: string;
          description: string;
          end_time: string;
          id: string;
          link: string | null;
          location: string | null;
          location_type: string;
          mission_id: string | null;
          organizer_id: string;
          start_time: string;
          status: string;
          title: string;
        };
        Insert: {
          chapter_id?: string | null;
          created_at?: string;
          description: string;
          end_time: string;
          id?: string;
          link?: string | null;
          location?: string | null;
          location_type: string;
          mission_id?: string | null;
          organizer_id: string;
          start_time: string;
          status?: string;
          title: string;
        };
        Update: {
          chapter_id?: string | null;
          created_at?: string;
          description?: string;
          end_time?: string;
          id?: string;
          link?: string | null;
          location?: string | null;
          location_type?: string;
          mission_id?: string | null;
          organizer_id?: string;
          start_time?: string;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      geo_countries: {
        Row: {
          active: boolean;
          country_code: string;
          display_name: string;
          source_version: string;
        };
        Insert: {
          active?: boolean;
          country_code: string;
          display_name: string;
          source_version?: string;
        };
        Update: {
          active?: boolean;
          country_code?: string;
          display_name?: string;
          source_version?: string;
        };
        Relationships: [];
      };
      geo_places: {
        Row: {
          active: boolean;
          country_code: string;
          created_at: string;
          display_name: string;
          id: string;
          normalized_name: string;
          region_id: string | null;
          source_key: string | null;
          source_version: string | null;
          timezone_name: string | null;
        };
        Insert: {
          active?: boolean;
          country_code: string;
          created_at?: string;
          display_name: string;
          id?: string;
          normalized_name: string;
          region_id?: string | null;
          source_key?: string | null;
          source_version?: string | null;
          timezone_name?: string | null;
        };
        Update: {
          active?: boolean;
          country_code?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          normalized_name?: string;
          region_id?: string | null;
          source_key?: string | null;
          source_version?: string | null;
          timezone_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "geo_places_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "geo_countries";
            referencedColumns: ["country_code"];
          },
          {
            foreignKeyName: "geo_places_region_country_fkey";
            columns: ["region_id", "country_code"];
            isOneToOne: false;
            referencedRelation: "geo_regions";
            referencedColumns: ["id", "country_code"];
          },
          {
            foreignKeyName: "geo_places_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "geo_regions";
            referencedColumns: ["id"];
          },
        ];
      };
      geo_regions: {
        Row: {
          active: boolean;
          country_code: string;
          created_at: string;
          display_name: string;
          id: string;
          region_code: string;
          source_key: string | null;
          source_version: string | null;
        };
        Insert: {
          active?: boolean;
          country_code: string;
          created_at?: string;
          display_name: string;
          id?: string;
          region_code: string;
          source_key?: string | null;
          source_version?: string | null;
        };
        Update: {
          active?: boolean;
          country_code?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          region_code?: string;
          source_key?: string | null;
          source_version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "geo_regions_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "geo_countries";
            referencedColumns: ["country_code"];
          },
        ];
      };
      io_api_keys: {
        Row: {
          created_at: string;
          created_by: string;
          environment_id: string | null;
          expires_at: string | null;
          hash_algorithm: string;
          hash_version: number;
          id: string;
          key_hash: string;
          key_prefix: string;
          last_four: string;
          last_used_at: string | null;
          limit_policy_version: number;
          name: string;
          project_id: string | null;
          requests_per_day: number;
          requests_per_minute: number;
          requests_per_month: number;
          revoked_at: string | null;
          scopes: string[];
          spend_currency_code: string;
          spend_per_day_nanos: number;
          spend_per_month_nanos: number;
          status: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          environment_id?: string | null;
          expires_at?: string | null;
          hash_algorithm?: string;
          hash_version?: number;
          id?: string;
          key_hash: string;
          key_prefix: string;
          last_four: string;
          last_used_at?: string | null;
          limit_policy_version?: number;
          name: string;
          project_id?: string | null;
          requests_per_day?: number;
          requests_per_minute?: number;
          requests_per_month?: number;
          revoked_at?: string | null;
          scopes?: string[];
          spend_currency_code?: string;
          spend_per_day_nanos?: number;
          spend_per_month_nanos?: number;
          status?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          environment_id?: string | null;
          expires_at?: string | null;
          hash_algorithm?: string;
          hash_version?: number;
          id?: string;
          key_hash?: string;
          key_prefix?: string;
          last_four?: string;
          last_used_at?: string | null;
          limit_policy_version?: number;
          name?: string;
          project_id?: string | null;
          requests_per_day?: number;
          requests_per_minute?: number;
          requests_per_month?: number;
          revoked_at?: string | null;
          scopes?: string[];
          spend_currency_code?: string;
          spend_per_day_nanos?: number;
          spend_per_month_nanos?: number;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_api_keys_environment_project_workspace_fkey";
            columns: ["environment_id", "project_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_environments";
            referencedColumns: ["id", "project_id", "workspace_id"];
          },
          {
            foreignKeyName: "io_api_keys_project_workspace_fkey";
            columns: ["project_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_projects";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "io_api_keys_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_audit_events: {
        Row: {
          actor_kind: string;
          actor_user_id: string | null;
          api_key_id: string | null;
          environment_id: string | null;
          event_type: string;
          id: number;
          occurred_at: string;
          payload: Json;
          project_id: string | null;
          request_id: string | null;
          source_ip_hash: string | null;
          workspace_id: string;
        };
        Insert: {
          actor_kind: string;
          actor_user_id?: string | null;
          api_key_id?: string | null;
          environment_id?: string | null;
          event_type: string;
          id?: never;
          occurred_at?: string;
          payload?: Json;
          project_id?: string | null;
          request_id?: string | null;
          source_ip_hash?: string | null;
          workspace_id: string;
        };
        Update: {
          actor_kind?: string;
          actor_user_id?: string | null;
          api_key_id?: string | null;
          environment_id?: string | null;
          event_type?: string;
          id?: never;
          occurred_at?: string;
          payload?: Json;
          project_id?: string | null;
          request_id?: string | null;
          source_ip_hash?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_audit_events_api_key_id_fkey";
            columns: ["api_key_id"];
            isOneToOne: false;
            referencedRelation: "io_api_key_metadata";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_audit_events_api_key_id_fkey";
            columns: ["api_key_id"];
            isOneToOne: false;
            referencedRelation: "io_api_keys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_audit_events_environment_project_workspace_fkey";
            columns: ["environment_id", "project_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_environments";
            referencedColumns: ["id", "project_id", "workspace_id"];
          },
          {
            foreignKeyName: "io_audit_events_project_workspace_fkey";
            columns: ["project_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_projects";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "io_audit_events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_billing_profiles: {
        Row: {
          address_lines: Json;
          billing_email: string;
          country_code: string;
          created_at: string;
          customer_type: string;
          gstin: string | null;
          legal_name: string;
          postal_code: string | null;
          state_code: string | null;
          tax_registration_name: string | null;
          updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
          version: number;
          workspace_id: string;
        };
        Insert: {
          address_lines: Json;
          billing_email: string;
          country_code: string;
          created_at?: string;
          customer_type: string;
          gstin?: string | null;
          legal_name: string;
          postal_code?: string | null;
          state_code?: string | null;
          tax_registration_name?: string | null;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          version?: number;
          workspace_id: string;
        };
        Update: {
          address_lines?: Json;
          billing_email?: string;
          country_code?: string;
          created_at?: string;
          customer_type?: string;
          gstin?: string | null;
          legal_name?: string;
          postal_code?: string | null;
          state_code?: string | null;
          tax_registration_name?: string | null;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          version?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_billing_profiles_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_budget_limits: {
        Row: {
          created_at: string;
          created_by: string;
          currency_code: string;
          hard_limit_minor: number;
          id: string;
          period_end: string;
          period_start: string;
          reason: string;
          status: string;
          updated_at: string;
          updated_by: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          currency_code: string;
          hard_limit_minor: number;
          id?: string;
          period_end: string;
          period_start: string;
          reason: string;
          status?: string;
          updated_at?: string;
          updated_by: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          currency_code?: string;
          hard_limit_minor?: number;
          id?: string;
          period_end?: string;
          period_start?: string;
          reason?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_budget_limits_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_capacity_sources: {
        Row: {
          access_mode: string;
          created_at: string;
          created_by: string;
          data_residency_country: string | null;
          display_name: string;
          id: string;
          operator_name: string;
          procurement_model: string;
          provenance: string;
          public_capacity_metadata: Json;
          public_notes: string | null;
          region_code: string | null;
          source_key: string;
          status: string;
          updated_at: string;
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          access_mode?: string;
          created_at?: string;
          created_by: string;
          data_residency_country?: string | null;
          display_name: string;
          id?: string;
          operator_name: string;
          procurement_model: string;
          provenance: string;
          public_capacity_metadata?: Json;
          public_notes?: string | null;
          region_code?: string | null;
          source_key: string;
          status?: string;
          updated_at?: string;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          access_mode?: string;
          created_at?: string;
          created_by?: string;
          data_residency_country?: string | null;
          display_name?: string;
          id?: string;
          operator_name?: string;
          procurement_model?: string;
          provenance?: string;
          public_capacity_metadata?: Json;
          public_notes?: string | null;
          region_code?: string | null;
          source_key?: string;
          status?: string;
          updated_at?: string;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      io_credit_accounts: {
        Row: {
          created_at: string;
          created_by: string | null;
          currency_code: string;
          id: string;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          currency_code: string;
          id?: string;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_credit_accounts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_credit_entries: {
        Row: {
          account_id: string;
          amount_nanos: number;
          entry_kind: string;
          external_reference: string | null;
          id: string;
          posted_at: string;
          posted_by: string | null;
          reason: string;
          usage_record_id: string | null;
        };
        Insert: {
          account_id: string;
          amount_nanos: number;
          entry_kind: string;
          external_reference?: string | null;
          id?: string;
          posted_at?: string;
          posted_by?: string | null;
          reason: string;
          usage_record_id?: string | null;
        };
        Update: {
          account_id?: string;
          amount_nanos?: number;
          entry_kind?: string;
          external_reference?: string | null;
          id?: string;
          posted_at?: string;
          posted_by?: string | null;
          reason?: string;
          usage_record_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "io_credit_entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "io_credit_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_credit_entries_usage_record_id_fkey";
            columns: ["usage_record_id"];
            isOneToOne: true;
            referencedRelation: "io_usage_records";
            referencedColumns: ["id"];
          },
        ];
      };
      io_endpoint_capability_versions: {
        Row: {
          endpoint_id: string;
          evidence_url: string | null;
          id: string;
          recorded_at: string;
          supports_audio: boolean;
          supports_batch: boolean;
          supports_cancellation: boolean;
          supports_chat: boolean;
          supports_embeddings: boolean;
          supports_model_listing: boolean;
          supports_streaming: boolean;
          supports_structured_output: boolean;
          supports_tools: boolean;
          supports_usage_receipt: boolean;
          supports_vision: boolean;
          tested_at: string | null;
          verification_state: string;
          verified_by: string | null;
          version: number;
        };
        Insert: {
          endpoint_id: string;
          evidence_url?: string | null;
          id?: string;
          recorded_at?: string;
          supports_audio?: boolean;
          supports_batch?: boolean;
          supports_cancellation?: boolean;
          supports_chat?: boolean;
          supports_embeddings?: boolean;
          supports_model_listing?: boolean;
          supports_streaming?: boolean;
          supports_structured_output?: boolean;
          supports_tools?: boolean;
          supports_usage_receipt?: boolean;
          supports_vision?: boolean;
          tested_at?: string | null;
          verification_state?: string;
          verified_by?: string | null;
          version: number;
        };
        Update: {
          endpoint_id?: string;
          evidence_url?: string | null;
          id?: string;
          recorded_at?: string;
          supports_audio?: boolean;
          supports_batch?: boolean;
          supports_cancellation?: boolean;
          supports_chat?: boolean;
          supports_embeddings?: boolean;
          supports_model_listing?: boolean;
          supports_streaming?: boolean;
          supports_structured_output?: boolean;
          supports_tools?: boolean;
          supports_usage_receipt?: boolean;
          supports_vision?: boolean;
          tested_at?: string | null;
          verification_state?: string;
          verified_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "io_endpoint_capability_versions_endpoint_id_fkey";
            columns: ["endpoint_id"];
            isOneToOne: false;
            referencedRelation: "io_model_endpoints";
            referencedColumns: ["id"];
          },
        ];
      };
      io_endpoint_pricing_versions: {
        Row: {
          billing_meter: string;
          cached_input_price_nanos: number | null;
          currency_code: string;
          effective_from: string;
          effective_until: string | null;
          endpoint_id: string;
          evidence_note: string | null;
          evidence_url: string | null;
          id: string;
          input_price_nanos: number | null;
          member_visible: boolean;
          output_price_nanos: number | null;
          publication_state: string;
          recorded_at: string;
          recorded_by: string | null;
          unit_price_nanos: number | null;
          unit_quantity: number;
          version: number;
        };
        Insert: {
          billing_meter: string;
          cached_input_price_nanos?: number | null;
          currency_code: string;
          effective_from: string;
          effective_until?: string | null;
          endpoint_id: string;
          evidence_note?: string | null;
          evidence_url?: string | null;
          id?: string;
          input_price_nanos?: number | null;
          member_visible?: boolean;
          output_price_nanos?: number | null;
          publication_state?: string;
          recorded_at?: string;
          recorded_by?: string | null;
          unit_price_nanos?: number | null;
          unit_quantity: number;
          version: number;
        };
        Update: {
          billing_meter?: string;
          cached_input_price_nanos?: number | null;
          currency_code?: string;
          effective_from?: string;
          effective_until?: string | null;
          endpoint_id?: string;
          evidence_note?: string | null;
          evidence_url?: string | null;
          id?: string;
          input_price_nanos?: number | null;
          member_visible?: boolean;
          output_price_nanos?: number | null;
          publication_state?: string;
          recorded_at?: string;
          recorded_by?: string | null;
          unit_price_nanos?: number | null;
          unit_quantity?: number;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "io_endpoint_pricing_versions_endpoint_id_fkey";
            columns: ["endpoint_id"];
            isOneToOne: false;
            referencedRelation: "io_model_endpoints";
            referencedColumns: ["id"];
          },
        ];
      };
      io_environments: {
        Row: {
          created_at: string;
          created_by: string;
          environment_type: string;
          id: string;
          monthly_budget_inr: number | null;
          name: string;
          project_id: string;
          slug: string;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          environment_type?: string;
          id?: string;
          monthly_budget_inr?: number | null;
          name: string;
          project_id: string;
          slug: string;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          environment_type?: string;
          id?: string;
          monthly_budget_inr?: number | null;
          name?: string;
          project_id?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_environments_project_workspace_fkey";
            columns: ["project_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_projects";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "io_environments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_fx_rate_versions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          base_currency_code: string;
          created_at: string;
          created_by: string;
          effective_from: string;
          effective_until: string;
          evidence_url: string;
          id: string;
          observed_at: string;
          quote_currency_code: string;
          rate_denominator: number;
          rate_numerator: number;
          source_name: string;
          status: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          base_currency_code: string;
          created_at?: string;
          created_by: string;
          effective_from: string;
          effective_until: string;
          evidence_url: string;
          id?: string;
          observed_at: string;
          quote_currency_code: string;
          rate_denominator: number;
          rate_numerator: number;
          source_name: string;
          status?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          base_currency_code?: string;
          created_at?: string;
          created_by?: string;
          effective_from?: string;
          effective_until?: string;
          evidence_url?: string;
          id?: string;
          observed_at?: string;
          quote_currency_code?: string;
          rate_denominator?: number;
          rate_numerator?: number;
          source_name?: string;
          status?: string;
        };
        Relationships: [];
      };
      io_invoice_lines: {
        Row: {
          amount_due_nanos: number;
          credit_applied_nanos: number;
          customer_charge_nanos: number;
          id: number;
          input_tokens: number | null;
          invoice_id: string;
          model_key: string;
          output_tokens: number | null;
          provider_cost_nanos: number;
          provider_key: string;
          receipt_id: string;
          service_fee_nanos: number;
          source_amount_due_nanos: number | null;
          source_credit_applied_nanos: number | null;
          source_currency_code: string | null;
          source_customer_charge_nanos: number | null;
          source_provider_cost_nanos: number | null;
          source_service_fee_nanos: number | null;
          usage_record_id: string;
          usage_recorded_at: string;
        };
        Insert: {
          amount_due_nanos: number;
          credit_applied_nanos: number;
          customer_charge_nanos: number;
          id?: never;
          input_tokens?: number | null;
          invoice_id: string;
          model_key: string;
          output_tokens?: number | null;
          provider_cost_nanos: number;
          provider_key: string;
          receipt_id: string;
          service_fee_nanos: number;
          source_amount_due_nanos?: number | null;
          source_credit_applied_nanos?: number | null;
          source_currency_code?: string | null;
          source_customer_charge_nanos?: number | null;
          source_provider_cost_nanos?: number | null;
          source_service_fee_nanos?: number | null;
          usage_record_id: string;
          usage_recorded_at: string;
        };
        Update: {
          amount_due_nanos?: number;
          credit_applied_nanos?: number;
          customer_charge_nanos?: number;
          id?: never;
          input_tokens?: number | null;
          invoice_id?: string;
          model_key?: string;
          output_tokens?: number | null;
          provider_cost_nanos?: number;
          provider_key?: string;
          receipt_id?: string;
          service_fee_nanos?: number;
          source_amount_due_nanos?: number | null;
          source_credit_applied_nanos?: number | null;
          source_currency_code?: string | null;
          source_customer_charge_nanos?: number | null;
          source_provider_cost_nanos?: number | null;
          source_service_fee_nanos?: number | null;
          usage_record_id?: string;
          usage_recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_invoice_lines_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "io_invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_invoice_lines_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: true;
            referencedRelation: "io_route_receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_invoice_lines_usage_record_id_fkey";
            columns: ["usage_record_id"];
            isOneToOne: true;
            referencedRelation: "io_usage_records";
            referencedColumns: ["id"];
          },
        ];
      };
      io_invoices: {
        Row: {
          amount_due_nanos: number;
          buyer_snapshot: Json;
          collection_amount_nanos: number | null;
          created_at: string;
          created_by: string | null;
          credit_applied_nanos: number;
          currency_code: string;
          due_at: string | null;
          fx_evidence_url: string | null;
          fx_rate_denominator: number | null;
          fx_rate_numerator: number | null;
          fx_rate_version_id: string | null;
          id: string;
          invoice_number: string;
          issued_at: string | null;
          issued_by: string | null;
          paid_nanos: number;
          payment_state: string;
          period_end: string;
          period_start: string;
          provider_cost_nanos: number;
          refunded_nanos: number;
          rounding_nanos: number;
          seller_snapshot: Json;
          service_fee_nanos: number;
          source_amount_due_nanos: number | null;
          source_credit_applied_nanos: number | null;
          source_currency_code: string | null;
          source_provider_cost_nanos: number | null;
          source_service_fee_nanos: number | null;
          source_subtotal_nanos: number | null;
          state: string;
          subtotal_nanos: number;
          supply_kind: string | null;
          tax_evidence_url: string | null;
          tax_nanos: number;
          tax_policy_version_id: string | null;
          tax_status: string;
          total_nanos: number;
          void_reason: string | null;
          voided_at: string | null;
          workspace_id: string;
        };
        Insert: {
          amount_due_nanos: number;
          buyer_snapshot?: Json;
          collection_amount_nanos?: number | null;
          created_at?: string;
          created_by?: string | null;
          credit_applied_nanos: number;
          currency_code: string;
          due_at?: string | null;
          fx_evidence_url?: string | null;
          fx_rate_denominator?: number | null;
          fx_rate_numerator?: number | null;
          fx_rate_version_id?: string | null;
          id?: string;
          invoice_number: string;
          issued_at?: string | null;
          issued_by?: string | null;
          paid_nanos?: number;
          payment_state?: string;
          period_end: string;
          period_start: string;
          provider_cost_nanos: number;
          refunded_nanos?: number;
          rounding_nanos?: number;
          seller_snapshot?: Json;
          service_fee_nanos: number;
          source_amount_due_nanos?: number | null;
          source_credit_applied_nanos?: number | null;
          source_currency_code?: string | null;
          source_provider_cost_nanos?: number | null;
          source_service_fee_nanos?: number | null;
          source_subtotal_nanos?: number | null;
          state?: string;
          subtotal_nanos: number;
          supply_kind?: string | null;
          tax_evidence_url?: string | null;
          tax_nanos?: number;
          tax_policy_version_id?: string | null;
          tax_status?: string;
          total_nanos: number;
          void_reason?: string | null;
          voided_at?: string | null;
          workspace_id: string;
        };
        Update: {
          amount_due_nanos?: number;
          buyer_snapshot?: Json;
          collection_amount_nanos?: number | null;
          created_at?: string;
          created_by?: string | null;
          credit_applied_nanos?: number;
          currency_code?: string;
          due_at?: string | null;
          fx_evidence_url?: string | null;
          fx_rate_denominator?: number | null;
          fx_rate_numerator?: number | null;
          fx_rate_version_id?: string | null;
          id?: string;
          invoice_number?: string;
          issued_at?: string | null;
          issued_by?: string | null;
          paid_nanos?: number;
          payment_state?: string;
          period_end?: string;
          period_start?: string;
          provider_cost_nanos?: number;
          refunded_nanos?: number;
          rounding_nanos?: number;
          seller_snapshot?: Json;
          service_fee_nanos?: number;
          source_amount_due_nanos?: number | null;
          source_credit_applied_nanos?: number | null;
          source_currency_code?: string | null;
          source_provider_cost_nanos?: number | null;
          source_service_fee_nanos?: number | null;
          source_subtotal_nanos?: number | null;
          state?: string;
          subtotal_nanos?: number;
          supply_kind?: string | null;
          tax_evidence_url?: string | null;
          tax_nanos?: number;
          tax_policy_version_id?: string | null;
          tax_status?: string;
          total_nanos?: number;
          void_reason?: string | null;
          voided_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_invoices_fx_rate_version_id_fkey";
            columns: ["fx_rate_version_id"];
            isOneToOne: false;
            referencedRelation: "io_fx_rate_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_invoices_tax_policy_version_id_fkey";
            columns: ["tax_policy_version_id"];
            isOneToOne: false;
            referencedRelation: "io_tax_policy_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_invoices_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_model_endpoints: {
        Row: {
          capacity_mode: string;
          capacity_source_id: string | null;
          created_at: string;
          created_by: string;
          endpoint_key: string;
          id: string;
          max_concurrency: number | null;
          member_visible: boolean;
          model_id: string;
          provider_id: string;
          region_code: string | null;
          residency_country_code: string | null;
          residency_evidence_url: string | null;
          retention_class: string;
          routing_state: string;
          updated_at: string;
        };
        Insert: {
          capacity_mode: string;
          capacity_source_id?: string | null;
          created_at?: string;
          created_by?: string;
          endpoint_key: string;
          id?: string;
          max_concurrency?: number | null;
          member_visible?: boolean;
          model_id: string;
          provider_id: string;
          region_code?: string | null;
          residency_country_code?: string | null;
          residency_evidence_url?: string | null;
          retention_class?: string;
          routing_state?: string;
          updated_at?: string;
        };
        Update: {
          capacity_mode?: string;
          capacity_source_id?: string | null;
          created_at?: string;
          created_by?: string;
          endpoint_key?: string;
          id?: string;
          max_concurrency?: number | null;
          member_visible?: boolean;
          model_id?: string;
          provider_id?: string;
          region_code?: string | null;
          residency_country_code?: string | null;
          residency_evidence_url?: string | null;
          retention_class?: string;
          routing_state?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_model_endpoints_capacity_source_id_fkey";
            columns: ["capacity_source_id"];
            isOneToOne: false;
            referencedRelation: "io_capacity_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_model_endpoints_model_provider_fkey";
            columns: ["model_id", "provider_id"];
            isOneToOne: false;
            referencedRelation: "io_models";
            referencedColumns: ["id", "provider_id"];
          },
        ];
      };
      io_models: {
        Row: {
          auto_route_tier: string;
          commercial_hosting_rights: string;
          commercial_redistribution_rights: string;
          created_at: string;
          created_by: string;
          deprecation_at: string | null;
          display_name: string;
          id: string;
          licence_evidence_url: string | null;
          licence_name: string | null;
          listing_state: string;
          max_context_tokens: number | null;
          modalities: string[];
          model_creator: string | null;
          model_family: string | null;
          origin_country_code: string | null;
          provider_id: string;
          provider_model_id: string;
          released_at: string | null;
          revision: string | null;
          updated_at: string;
        };
        Insert: {
          auto_route_tier?: string;
          commercial_hosting_rights?: string;
          commercial_redistribution_rights?: string;
          created_at?: string;
          created_by?: string;
          deprecation_at?: string | null;
          display_name: string;
          id?: string;
          licence_evidence_url?: string | null;
          licence_name?: string | null;
          listing_state?: string;
          max_context_tokens?: number | null;
          modalities?: string[];
          model_creator?: string | null;
          model_family?: string | null;
          origin_country_code?: string | null;
          provider_id: string;
          provider_model_id: string;
          released_at?: string | null;
          revision?: string | null;
          updated_at?: string;
        };
        Update: {
          auto_route_tier?: string;
          commercial_hosting_rights?: string;
          commercial_redistribution_rights?: string;
          created_at?: string;
          created_by?: string;
          deprecation_at?: string | null;
          display_name?: string;
          id?: string;
          licence_evidence_url?: string | null;
          licence_name?: string | null;
          listing_state?: string;
          max_context_tokens?: number | null;
          modalities?: string[];
          model_creator?: string | null;
          model_family?: string | null;
          origin_country_code?: string | null;
          provider_id?: string;
          provider_model_id?: string;
          released_at?: string | null;
          revision?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_models_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "io_providers";
            referencedColumns: ["id"];
          },
        ];
      };
      io_payment_intents: {
        Row: {
          amount_minor: number;
          amount_nanos: number;
          captured_at: string | null;
          checkout_payment_id: string | null;
          checkout_signature_sha256: string | null;
          checkout_verified_at: string | null;
          client_request_id: string;
          created_at: string;
          created_by: string;
          currency_code: string;
          environment: string;
          expires_at: string;
          external_order_id: string | null;
          external_payment_id: string | null;
          failure_code: string | null;
          id: string;
          invoice_id: string;
          processor_config_id: string;
          provider_key: string;
          provider_receipt: string | null;
          state: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          amount_minor: number;
          amount_nanos: number;
          captured_at?: string | null;
          checkout_payment_id?: string | null;
          checkout_signature_sha256?: string | null;
          checkout_verified_at?: string | null;
          client_request_id: string;
          created_at?: string;
          created_by: string;
          currency_code: string;
          environment: string;
          expires_at: string;
          external_order_id?: string | null;
          external_payment_id?: string | null;
          failure_code?: string | null;
          id?: string;
          invoice_id: string;
          processor_config_id: string;
          provider_key: string;
          provider_receipt?: string | null;
          state?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          amount_minor?: number;
          amount_nanos?: number;
          captured_at?: string | null;
          checkout_payment_id?: string | null;
          checkout_signature_sha256?: string | null;
          checkout_verified_at?: string | null;
          client_request_id?: string;
          created_at?: string;
          created_by?: string;
          currency_code?: string;
          environment?: string;
          expires_at?: string;
          external_order_id?: string | null;
          external_payment_id?: string | null;
          failure_code?: string | null;
          id?: string;
          invoice_id?: string;
          processor_config_id?: string;
          provider_key?: string;
          provider_receipt?: string | null;
          state?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_payment_intents_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "io_invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_payment_intents_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_projects: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          name: string;
          slug: string;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_projects_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_provider_attempts: {
        Row: {
          attempt_index: number;
          attempt_state: string;
          completed_at: string;
          endpoint_id: string | null;
          error_code: string | null;
          id: string;
          input_tokens: number | null;
          model_id: string | null;
          output_tokens: number | null;
          provider_id: string | null;
          provider_request_id: string | null;
          receipt_id: string;
          started_at: string;
          upstream_status: number | null;
        };
        Insert: {
          attempt_index: number;
          attempt_state: string;
          completed_at: string;
          endpoint_id?: string | null;
          error_code?: string | null;
          id?: string;
          input_tokens?: number | null;
          model_id?: string | null;
          output_tokens?: number | null;
          provider_id?: string | null;
          provider_request_id?: string | null;
          receipt_id: string;
          started_at: string;
          upstream_status?: number | null;
        };
        Update: {
          attempt_index?: number;
          attempt_state?: string;
          completed_at?: string;
          endpoint_id?: string | null;
          error_code?: string | null;
          id?: string;
          input_tokens?: number | null;
          model_id?: string | null;
          output_tokens?: number | null;
          provider_id?: string | null;
          provider_request_id?: string | null;
          receipt_id?: string;
          started_at?: string;
          upstream_status?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "io_provider_attempts_endpoint_id_fkey";
            columns: ["endpoint_id"];
            isOneToOne: false;
            referencedRelation: "io_model_endpoints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_provider_attempts_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: false;
            referencedRelation: "io_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_provider_attempts_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "io_providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_provider_attempts_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "io_route_receipts";
            referencedColumns: ["id"];
          },
        ];
      };
      io_provider_reconciliation_results: {
        Row: {
          attempt_id: string | null;
          delta_nanos: number | null;
          expected_nanos: number | null;
          reason_code: string;
          receipt_id: string | null;
          result_state: string;
          run_id: string;
          stated_nanos: number;
          statement_line_id: number;
        };
        Insert: {
          attempt_id?: string | null;
          delta_nanos?: number | null;
          expected_nanos?: number | null;
          reason_code: string;
          receipt_id?: string | null;
          result_state: string;
          run_id: string;
          stated_nanos: number;
          statement_line_id: number;
        };
        Update: {
          attempt_id?: string | null;
          delta_nanos?: number | null;
          expected_nanos?: number | null;
          reason_code?: string;
          receipt_id?: string | null;
          result_state?: string;
          run_id?: string;
          stated_nanos?: number;
          statement_line_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "io_provider_reconciliation_results_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "io_provider_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_provider_reconciliation_results_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "io_route_receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_provider_reconciliation_results_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "io_provider_reconciliation_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_provider_reconciliation_results_statement_line_id_fkey";
            columns: ["statement_line_id"];
            isOneToOne: false;
            referencedRelation: "io_provider_statement_lines";
            referencedColumns: ["id"];
          },
        ];
      };
      io_provider_reconciliation_runs: {
        Row: {
          delta_nanos: number;
          exception_count: number;
          expected_total_nanos: number;
          id: string;
          matched_count: number;
          run_at: string;
          run_by: string;
          run_state: string;
          stated_total_nanos: number;
          statement_id: string;
        };
        Insert: {
          delta_nanos: number;
          exception_count: number;
          expected_total_nanos: number;
          id?: string;
          matched_count: number;
          run_at?: string;
          run_by: string;
          run_state?: string;
          stated_total_nanos: number;
          statement_id: string;
        };
        Update: {
          delta_nanos?: number;
          exception_count?: number;
          expected_total_nanos?: number;
          id?: string;
          matched_count?: number;
          run_at?: string;
          run_by?: string;
          run_state?: string;
          stated_total_nanos?: number;
          statement_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_provider_reconciliation_runs_statement_id_fkey";
            columns: ["statement_id"];
            isOneToOne: false;
            referencedRelation: "io_provider_statements";
            referencedColumns: ["id"];
          },
        ];
      };
      io_provider_statement_lines: {
        Row: {
          amount_nanos: number;
          external_line_id: string;
          id: number;
          input_tokens: number | null;
          metadata: Json;
          model_reference: string | null;
          output_tokens: number | null;
          provider_request_id: string | null;
          service_date: string;
          statement_id: string;
        };
        Insert: {
          amount_nanos: number;
          external_line_id: string;
          id?: never;
          input_tokens?: number | null;
          metadata?: Json;
          model_reference?: string | null;
          output_tokens?: number | null;
          provider_request_id?: string | null;
          service_date: string;
          statement_id: string;
        };
        Update: {
          amount_nanos?: number;
          external_line_id?: string;
          id?: never;
          input_tokens?: number | null;
          metadata?: Json;
          model_reference?: string | null;
          output_tokens?: number | null;
          provider_request_id?: string | null;
          service_date?: string;
          statement_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_provider_statement_lines_statement_id_fkey";
            columns: ["statement_id"];
            isOneToOne: false;
            referencedRelation: "io_provider_statements";
            referencedColumns: ["id"];
          },
        ];
      };
      io_provider_statements: {
        Row: {
          content_sha256: string;
          currency_code: string;
          evidence_url: string;
          id: string;
          imported_at: string;
          imported_by: string;
          period_end: string;
          period_start: string;
          provider_id: string;
          stated_total_nanos: number;
          statement_number: string;
        };
        Insert: {
          content_sha256: string;
          currency_code: string;
          evidence_url: string;
          id?: string;
          imported_at?: string;
          imported_by: string;
          period_end: string;
          period_start: string;
          provider_id: string;
          stated_total_nanos: number;
          statement_number: string;
        };
        Update: {
          content_sha256?: string;
          currency_code?: string;
          evidence_url?: string;
          id?: string;
          imported_at?: string;
          imported_by?: string;
          period_end?: string;
          period_start?: string;
          provider_id?: string;
          stated_total_nanos?: number;
          statement_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_provider_statements_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "io_providers";
            referencedColumns: ["id"];
          },
        ];
      };
      io_providers: {
        Row: {
          catalogue_visibility: string;
          commercial_access_state: string;
          commercial_terms_evidence_url: string | null;
          commercial_terms_reviewed_at: string | null;
          commercial_terms_reviewed_by: string | null;
          created_at: string;
          created_by: string;
          data_retention_class: string;
          default_region_code: string | null;
          default_residency_country: string | null;
          display_name: string;
          id: string;
          integration_style: string;
          lifecycle_state: string;
          operator_name: string | null;
          provider_key: string;
          provider_kind: string;
          public_summary: string | null;
          resale_authorized: boolean;
          terms_evidence_url: string | null;
          terms_version: string | null;
          training_use_class: string;
          updated_at: string;
        };
        Insert: {
          catalogue_visibility?: string;
          commercial_access_state?: string;
          commercial_terms_evidence_url?: string | null;
          commercial_terms_reviewed_at?: string | null;
          commercial_terms_reviewed_by?: string | null;
          created_at?: string;
          created_by?: string;
          data_retention_class?: string;
          default_region_code?: string | null;
          default_residency_country?: string | null;
          display_name: string;
          id?: string;
          integration_style: string;
          lifecycle_state?: string;
          operator_name?: string | null;
          provider_key: string;
          provider_kind: string;
          public_summary?: string | null;
          resale_authorized?: boolean;
          terms_evidence_url?: string | null;
          terms_version?: string | null;
          training_use_class?: string;
          updated_at?: string;
        };
        Update: {
          catalogue_visibility?: string;
          commercial_access_state?: string;
          commercial_terms_evidence_url?: string | null;
          commercial_terms_reviewed_at?: string | null;
          commercial_terms_reviewed_by?: string | null;
          created_at?: string;
          created_by?: string;
          data_retention_class?: string;
          default_region_code?: string | null;
          default_residency_country?: string | null;
          display_name?: string;
          id?: string;
          integration_style?: string;
          lifecycle_state?: string;
          operator_name?: string | null;
          provider_key?: string;
          provider_kind?: string;
          public_summary?: string | null;
          resale_authorized?: boolean;
          terms_evidence_url?: string | null;
          terms_version?: string | null;
          training_use_class?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      io_refunds: {
        Row: {
          amount_minor: number;
          amount_nanos: number;
          client_request_id: string;
          completed_at: string | null;
          currency_code: string;
          external_refund_id: string | null;
          failure_code: string | null;
          id: string;
          invoice_id: string;
          payment_intent_id: string;
          reason: string;
          requested_at: string;
          requested_by: string;
          state: string;
          submitted_at: string | null;
          workspace_id: string;
        };
        Insert: {
          amount_minor: number;
          amount_nanos: number;
          client_request_id: string;
          completed_at?: string | null;
          currency_code: string;
          external_refund_id?: string | null;
          failure_code?: string | null;
          id?: string;
          invoice_id: string;
          payment_intent_id: string;
          reason: string;
          requested_at?: string;
          requested_by: string;
          state?: string;
          submitted_at?: string | null;
          workspace_id: string;
        };
        Update: {
          amount_minor?: number;
          amount_nanos?: number;
          client_request_id?: string;
          completed_at?: string | null;
          currency_code?: string;
          external_refund_id?: string | null;
          failure_code?: string | null;
          id?: string;
          invoice_id?: string;
          payment_intent_id?: string;
          reason?: string;
          requested_at?: string;
          requested_by?: string;
          state?: string;
          submitted_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_refunds_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "io_invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_refunds_payment_intent_id_fkey";
            columns: ["payment_intent_id"];
            isOneToOne: false;
            referencedRelation: "io_payment_intents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_refunds_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_route_policies: {
        Row: {
          activated_at: string | null;
          activated_by: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          environment_id: string;
          id: string;
          name: string;
          policy_document: Json;
          state: string;
          updated_at: string;
          version: number;
          workspace_id: string;
        };
        Insert: {
          activated_at?: string | null;
          activated_by?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          environment_id: string;
          id?: string;
          name: string;
          policy_document: Json;
          state?: string;
          updated_at?: string;
          version: number;
          workspace_id: string;
        };
        Update: {
          activated_at?: string | null;
          activated_by?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          environment_id?: string;
          id?: string;
          name?: string;
          policy_document?: Json;
          state?: string;
          updated_at?: string;
          version?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_route_policies_environment_workspace_fkey";
            columns: ["environment_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_environments";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "io_route_policies_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_route_receipts: {
        Row: {
          actor_user_id: string;
          candidate_count: number;
          candidate_summary: Json;
          capability_version: number | null;
          completed_at: string;
          created_at: string;
          customer_charge_nanos: number | null;
          estimated_cost_nanos: number | null;
          fallback_count: number;
          id: string;
          input_tokens: number | null;
          output_tokens: number | null;
          policy_snapshot: Json;
          price_version: number | null;
          provider_cost_nanos: number | null;
          request_id: string;
          result_state: string;
          route_strategy: string;
          selected_capacity_mode: string | null;
          selected_capacity_source_id: string | null;
          selected_currency_code: string | null;
          selected_endpoint_id: string | null;
          selected_model_id: string | null;
          selected_model_key: string | null;
          selected_provider_id: string | null;
          selected_provider_key: string | null;
          selected_region_code: string | null;
          selected_residency_country_code: string | null;
          selected_retention_class: string | null;
          service_fee_basis_points: number | null;
          service_fee_nanos: number | null;
          service_fee_policy_version: number | null;
          workspace_id: string;
        };
        Insert: {
          actor_user_id: string;
          candidate_count?: number;
          candidate_summary?: Json;
          capability_version?: number | null;
          completed_at?: string;
          created_at?: string;
          customer_charge_nanos?: number | null;
          estimated_cost_nanos?: number | null;
          fallback_count?: number;
          id?: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          policy_snapshot?: Json;
          price_version?: number | null;
          provider_cost_nanos?: number | null;
          request_id: string;
          result_state: string;
          route_strategy: string;
          selected_capacity_mode?: string | null;
          selected_capacity_source_id?: string | null;
          selected_currency_code?: string | null;
          selected_endpoint_id?: string | null;
          selected_model_id?: string | null;
          selected_model_key?: string | null;
          selected_provider_id?: string | null;
          selected_provider_key?: string | null;
          selected_region_code?: string | null;
          selected_residency_country_code?: string | null;
          selected_retention_class?: string | null;
          service_fee_basis_points?: number | null;
          service_fee_nanos?: number | null;
          service_fee_policy_version?: number | null;
          workspace_id: string;
        };
        Update: {
          actor_user_id?: string;
          candidate_count?: number;
          candidate_summary?: Json;
          capability_version?: number | null;
          completed_at?: string;
          created_at?: string;
          customer_charge_nanos?: number | null;
          estimated_cost_nanos?: number | null;
          fallback_count?: number;
          id?: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          policy_snapshot?: Json;
          price_version?: number | null;
          provider_cost_nanos?: number | null;
          request_id?: string;
          result_state?: string;
          route_strategy?: string;
          selected_capacity_mode?: string | null;
          selected_capacity_source_id?: string | null;
          selected_currency_code?: string | null;
          selected_endpoint_id?: string | null;
          selected_model_id?: string | null;
          selected_model_key?: string | null;
          selected_provider_id?: string | null;
          selected_provider_key?: string | null;
          selected_region_code?: string | null;
          selected_residency_country_code?: string | null;
          selected_retention_class?: string | null;
          service_fee_basis_points?: number | null;
          service_fee_nanos?: number | null;
          service_fee_policy_version?: number | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_route_receipts_selected_capacity_source_id_fkey";
            columns: ["selected_capacity_source_id"];
            isOneToOne: false;
            referencedRelation: "io_capacity_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_route_receipts_selected_endpoint_id_fkey";
            columns: ["selected_endpoint_id"];
            isOneToOne: false;
            referencedRelation: "io_model_endpoints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_route_receipts_selected_model_id_fkey";
            columns: ["selected_model_id"];
            isOneToOne: false;
            referencedRelation: "io_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_route_receipts_selected_provider_id_fkey";
            columns: ["selected_provider_id"];
            isOneToOne: false;
            referencedRelation: "io_providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_route_receipts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_tax_policy_versions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          buyer_country_code: string;
          buyer_state_code: string | null;
          cgst_basis_points: number;
          created_at: string;
          created_by: string;
          currency_code: string;
          effective_from: string;
          effective_until: string | null;
          evidence_url: string;
          id: string;
          igst_basis_points: number;
          policy_key: string;
          seller_address: Json;
          seller_country_code: string;
          seller_gstin: string | null;
          seller_legal_name: string;
          seller_state_code: string | null;
          service_accounting_code: string;
          service_description: string;
          sgst_basis_points: number;
          status: string;
          supply_kind: string;
          taxable_base: string;
          version: number;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          buyer_country_code: string;
          buyer_state_code?: string | null;
          cgst_basis_points?: number;
          created_at?: string;
          created_by: string;
          currency_code: string;
          effective_from: string;
          effective_until?: string | null;
          evidence_url: string;
          id?: string;
          igst_basis_points?: number;
          policy_key: string;
          seller_address: Json;
          seller_country_code: string;
          seller_gstin?: string | null;
          seller_legal_name: string;
          seller_state_code?: string | null;
          service_accounting_code: string;
          service_description: string;
          sgst_basis_points?: number;
          status?: string;
          supply_kind: string;
          taxable_base: string;
          version: number;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          buyer_country_code?: string;
          buyer_state_code?: string | null;
          cgst_basis_points?: number;
          created_at?: string;
          created_by?: string;
          currency_code?: string;
          effective_from?: string;
          effective_until?: string | null;
          evidence_url?: string;
          id?: string;
          igst_basis_points?: number;
          policy_key?: string;
          seller_address?: Json;
          seller_country_code?: string;
          seller_gstin?: string | null;
          seller_legal_name?: string;
          seller_state_code?: string | null;
          service_accounting_code?: string;
          service_description?: string;
          sgst_basis_points?: number;
          status?: string;
          supply_kind?: string;
          taxable_base?: string;
          version?: number;
        };
        Relationships: [];
      };
      io_terminal_approval_decisions: {
        Row: {
          decided_at: string;
          decided_by: string;
          decision: string;
          decision_scope: string;
          id: string;
          reason: string;
          request_id: string;
        };
        Insert: {
          decided_at?: string;
          decided_by: string;
          decision: string;
          decision_scope: string;
          id?: string;
          reason: string;
          request_id: string;
        };
        Update: {
          decided_at?: string;
          decided_by?: string;
          decision?: string;
          decision_scope?: string;
          id?: string;
          reason?: string;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_terminal_approval_decisions_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: true;
            referencedRelation: "io_terminal_approval_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      io_terminal_approval_requests: {
        Row: {
          created_at: string;
          decision_scope: string;
          expires_at: string;
          id: string;
          permission_kind: string;
          reason: string;
          requested_by: string;
          risk_class: string;
          session_id: string;
          state: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          decision_scope: string;
          expires_at: string;
          id?: string;
          permission_kind: string;
          reason: string;
          requested_by: string;
          risk_class: string;
          session_id: string;
          state?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          decision_scope?: string;
          expires_at?: string;
          id?: string;
          permission_kind?: string;
          reason?: string;
          requested_by?: string;
          risk_class?: string;
          session_id?: string;
          state?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_terminal_approval_requests_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "io_terminal_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      io_terminal_session_events: {
        Row: {
          actor_user_id: string | null;
          content_classification: string;
          created_at: string;
          event_key: string | null;
          event_type: string;
          id: number;
          occurred_at: string;
          redacted_payload: Json;
          sequence: number;
          session_id: string;
          sync_policy: string;
        };
        Insert: {
          actor_user_id?: string | null;
          content_classification?: string;
          created_at?: string;
          event_key?: string | null;
          event_type: string;
          id?: never;
          occurred_at?: string;
          redacted_payload?: Json;
          sequence: number;
          session_id: string;
          sync_policy?: string;
        };
        Update: {
          actor_user_id?: string | null;
          content_classification?: string;
          created_at?: string;
          event_key?: string | null;
          event_type?: string;
          id?: never;
          occurred_at?: string;
          redacted_payload?: Json;
          sequence?: number;
          session_id?: string;
          sync_policy?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_terminal_session_events_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "io_terminal_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      io_terminal_session_members: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          expires_at: string | null;
          invited_by: string | null;
          revoked_at: string | null;
          role: string;
          session_id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          invited_by?: string | null;
          revoked_at?: string | null;
          role: string;
          session_id: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
          invited_by?: string | null;
          revoked_at?: string | null;
          role?: string;
          session_id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_terminal_session_members_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "io_terminal_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      io_terminal_sessions: {
        Row: {
          completed_at: string | null;
          connector_kind: string;
          connector_origin_hash: string;
          created_at: string;
          created_by: string;
          execution_location: string;
          id: string;
          last_event_sequence: number;
          mode: string;
          parent_session_id: string | null;
          runtime_reference_hash: string;
          runtime_version: string | null;
          started_at: string;
          state: string;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          completed_at?: string | null;
          connector_kind?: string;
          connector_origin_hash: string;
          created_at?: string;
          created_by: string;
          execution_location?: string;
          id?: string;
          last_event_sequence?: number;
          mode: string;
          parent_session_id?: string | null;
          runtime_reference_hash: string;
          runtime_version?: string | null;
          started_at?: string;
          state?: string;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          completed_at?: string | null;
          connector_kind?: string;
          connector_origin_hash?: string;
          created_at?: string;
          created_by?: string;
          execution_location?: string;
          id?: string;
          last_event_sequence?: number;
          mode?: string;
          parent_session_id?: string | null;
          runtime_reference_hash?: string;
          runtime_version?: string | null;
          started_at?: string;
          state?: string;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_terminal_sessions_parent_session_id_fkey";
            columns: ["parent_session_id"];
            isOneToOne: false;
            referencedRelation: "io_terminal_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_terminal_sessions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_usage_records: {
        Row: {
          actor_user_id: string;
          amount_due_nanos: number;
          amount_minor: number;
          credit_applied_nanos: number;
          currency_code: string;
          customer_charge_nanos: number | null;
          endpoint_id: string;
          id: string;
          input_tokens: number | null;
          output_tokens: number | null;
          provider_cost_nanos: number | null;
          receipt_id: string;
          recorded_at: string;
          request_id: string;
          reservation_id: string;
          service_fee_basis_points: number | null;
          service_fee_nanos: number | null;
          service_fee_policy_version: number | null;
          workspace_id: string;
        };
        Insert: {
          actor_user_id: string;
          amount_due_nanos?: number;
          amount_minor: number;
          credit_applied_nanos?: number;
          currency_code: string;
          customer_charge_nanos?: number | null;
          endpoint_id: string;
          id?: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          provider_cost_nanos?: number | null;
          receipt_id: string;
          recorded_at?: string;
          request_id: string;
          reservation_id: string;
          service_fee_basis_points?: number | null;
          service_fee_nanos?: number | null;
          service_fee_policy_version?: number | null;
          workspace_id: string;
        };
        Update: {
          actor_user_id?: string;
          amount_due_nanos?: number;
          amount_minor?: number;
          credit_applied_nanos?: number;
          currency_code?: string;
          customer_charge_nanos?: number | null;
          endpoint_id?: string;
          id?: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          provider_cost_nanos?: number | null;
          receipt_id?: string;
          recorded_at?: string;
          request_id?: string;
          reservation_id?: string;
          service_fee_basis_points?: number | null;
          service_fee_nanos?: number | null;
          service_fee_policy_version?: number | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_usage_records_endpoint_id_fkey";
            columns: ["endpoint_id"];
            isOneToOne: false;
            referencedRelation: "io_model_endpoints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_usage_records_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: true;
            referencedRelation: "io_route_receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_usage_records_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: true;
            referencedRelation: "io_usage_reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_usage_records_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_usage_reservations: {
        Row: {
          actor_user_id: string;
          budget_limit_id: string;
          created_at: string;
          currency_code: string;
          endpoint_id: string;
          expires_at: string;
          id: string;
          receipt_id: string | null;
          request_id: string;
          reserved_minor: number;
          settled_at: string | null;
          settled_minor: number | null;
          state: string;
          workspace_id: string;
        };
        Insert: {
          actor_user_id: string;
          budget_limit_id: string;
          created_at?: string;
          currency_code: string;
          endpoint_id: string;
          expires_at: string;
          id?: string;
          receipt_id?: string | null;
          request_id: string;
          reserved_minor: number;
          settled_at?: string | null;
          settled_minor?: number | null;
          state?: string;
          workspace_id: string;
        };
        Update: {
          actor_user_id?: string;
          budget_limit_id?: string;
          created_at?: string;
          currency_code?: string;
          endpoint_id?: string;
          expires_at?: string;
          id?: string;
          receipt_id?: string | null;
          request_id?: string;
          reserved_minor?: number;
          settled_at?: string | null;
          settled_minor?: number | null;
          state?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_usage_reservations_budget_limit_id_fkey";
            columns: ["budget_limit_id"];
            isOneToOne: false;
            referencedRelation: "io_budget_limits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_usage_reservations_endpoint_id_fkey";
            columns: ["endpoint_id"];
            isOneToOne: false;
            referencedRelation: "io_model_endpoints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_usage_reservations_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: true;
            referencedRelation: "io_route_receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_usage_reservations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_workspace_capacity_grants: {
        Row: {
          capacity_source_id: string;
          created_at: string;
          created_by: string;
          grant_kind: string;
          id: string;
          priority: number;
          public_terms_note: string | null;
          quota_amount: number | null;
          quota_unit: string | null;
          routing_weight: number;
          sponsor_label: string | null;
          status: string;
          updated_at: string;
          valid_from: string | null;
          valid_until: string | null;
          workspace_id: string;
        };
        Insert: {
          capacity_source_id: string;
          created_at?: string;
          created_by: string;
          grant_kind: string;
          id?: string;
          priority?: number;
          public_terms_note?: string | null;
          quota_amount?: number | null;
          quota_unit?: string | null;
          routing_weight?: number;
          sponsor_label?: string | null;
          status?: string;
          updated_at?: string;
          valid_from?: string | null;
          valid_until?: string | null;
          workspace_id: string;
        };
        Update: {
          capacity_source_id?: string;
          created_at?: string;
          created_by?: string;
          grant_kind?: string;
          id?: string;
          priority?: number;
          public_terms_note?: string | null;
          quota_amount?: number | null;
          quota_unit?: string | null;
          routing_weight?: number;
          sponsor_label?: string | null;
          status?: string;
          updated_at?: string;
          valid_from?: string | null;
          valid_until?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_workspace_capacity_grants_capacity_source_id_fkey";
            columns: ["capacity_source_id"];
            isOneToOne: false;
            referencedRelation: "io_capacity_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_workspace_capacity_grants_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_workspace_members: {
        Row: {
          created_at: string;
          invited_by: string | null;
          role: string;
          status: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          invited_by?: string | null;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          invited_by?: string | null;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_workspace_provider_policies: {
        Row: {
          acknowledged_at: string | null;
          allow_china_hosted: boolean;
          allow_training_possible: boolean;
          created_at: string;
          updated_at: string;
          updated_by: string;
          workspace_id: string;
        };
        Insert: {
          acknowledged_at?: string | null;
          allow_china_hosted?: boolean;
          allow_training_possible?: boolean;
          created_at?: string;
          updated_at?: string;
          updated_by: string;
          workspace_id: string;
        };
        Update: {
          acknowledged_at?: string | null;
          allow_china_hosted?: boolean;
          allow_training_possible?: boolean;
          created_at?: string;
          updated_at?: string;
          updated_by?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_workspace_provider_policies_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      io_workspaces: {
        Row: {
          chapter_id: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          mission_id: string | null;
          name: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          chapter_id?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          mission_id?: string | null;
          name: string;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          chapter_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          mission_id?: string | null;
          name?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "io_workspaces_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "io_workspaces_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_attachments: {
        Row: {
          created_at: string;
          file_name: string;
          file_path: string;
          file_size: number | null;
          id: string;
          lesson_id: string;
          mime_type: string | null;
          uploaded_by: string;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_path: string;
          file_size?: number | null;
          id?: string;
          lesson_id: string;
          mime_type?: string | null;
          uploaded_by: string;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number | null;
          id?: string;
          lesson_id?: string;
          mime_type?: string | null;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_attachments_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_progress: {
        Row: {
          completed_at: string;
          lesson_id: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          lesson_id: string;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          lesson_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          content: string | null;
          created_at: string;
          duration_mins: number | null;
          id: string;
          module_id: string;
          slug: string;
          sort_order: number;
          status: string;
          title: string;
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          duration_mins?: number | null;
          id?: string;
          module_id: string;
          slug: string;
          sort_order?: number;
          status?: string;
          title: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          duration_mins?: number | null;
          id?: string;
          module_id?: string;
          slug?: string;
          sort_order?: number;
          status?: string;
          title?: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "course_modules";
            referencedColumns: ["id"];
          },
        ];
      };
      loops: {
        Row: {
          badges: string[];
          cost_per_iteration_inr: number | null;
          created_at: string;
          created_by: string | null;
          current_baseline_model: string | null;
          domain: string;
          eval_set_description: string | null;
          featured_on: string | null;
          hero_image_url: string | null;
          id: string;
          latency_target_ms: number | null;
          minimum_loop: Json;
          problem_statement: string | null;
          published_at: string | null;
          related_soda_slug: string | null;
          score_business_value: number;
          score_eval_rigor: number;
          score_india_fit: number;
          score_iteration_speed: number;
          slug: string;
          stack: string[];
          status: string;
          summary: string | null;
          tags: string[];
          title: string;
          trigger_to_rerun: string | null;
          updated_at: string;
          upgrade_history: Json;
          why_iterate: string | null;
        };
        Insert: {
          badges?: string[];
          cost_per_iteration_inr?: number | null;
          created_at?: string;
          created_by?: string | null;
          current_baseline_model?: string | null;
          domain?: string;
          eval_set_description?: string | null;
          featured_on?: string | null;
          hero_image_url?: string | null;
          id?: string;
          latency_target_ms?: number | null;
          minimum_loop?: Json;
          problem_statement?: string | null;
          published_at?: string | null;
          related_soda_slug?: string | null;
          score_business_value?: number;
          score_eval_rigor?: number;
          score_india_fit?: number;
          score_iteration_speed?: number;
          slug: string;
          stack?: string[];
          status?: string;
          summary?: string | null;
          tags?: string[];
          title: string;
          trigger_to_rerun?: string | null;
          updated_at?: string;
          upgrade_history?: Json;
          why_iterate?: string | null;
        };
        Update: {
          badges?: string[];
          cost_per_iteration_inr?: number | null;
          created_at?: string;
          created_by?: string | null;
          current_baseline_model?: string | null;
          domain?: string;
          eval_set_description?: string | null;
          featured_on?: string | null;
          hero_image_url?: string | null;
          id?: string;
          latency_target_ms?: number | null;
          minimum_loop?: Json;
          problem_statement?: string | null;
          published_at?: string | null;
          related_soda_slug?: string | null;
          score_business_value?: number;
          score_eval_rigor?: number;
          score_india_fit?: number;
          score_iteration_speed?: number;
          slug?: string;
          stack?: string[];
          status?: string;
          summary?: string | null;
          tags?: string[];
          title?: string;
          trigger_to_rerun?: string | null;
          updated_at?: string;
          upgrade_history?: Json;
          why_iterate?: string | null;
        };
        Relationships: [];
      };
      member_blocks: {
        Row: {
          blocked_user_id: string;
          blocker_id: string;
          created_at: string;
          reason_category: string;
        };
        Insert: {
          blocked_user_id: string;
          blocker_id: string;
          created_at?: string;
          reason_category?: string;
        };
        Update: {
          blocked_user_id?: string;
          blocker_id?: string;
          created_at?: string;
          reason_category?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_blocks_blocked_user_id_fkey";
            columns: ["blocked_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "member_blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      member_location_shares: {
        Row: {
          audience: string;
          city_label: string | null;
          consent_version: string;
          country_code: string;
          place_id: string | null;
          precision: string;
          region_id: string | null;
          region_label: string | null;
          shared_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          audience: string;
          city_label?: string | null;
          consent_version: string;
          country_code: string;
          place_id?: string | null;
          precision: string;
          region_id?: string | null;
          region_label?: string | null;
          shared_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          audience?: string;
          city_label?: string | null;
          consent_version?: string;
          country_code?: string;
          place_id?: string | null;
          precision?: string;
          region_id?: string | null;
          region_label?: string | null;
          shared_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_location_shares_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "geo_countries";
            referencedColumns: ["country_code"];
          },
          {
            foreignKeyName: "member_location_shares_place_country_fkey";
            columns: ["place_id", "country_code"];
            isOneToOne: false;
            referencedRelation: "geo_places";
            referencedColumns: ["id", "country_code"];
          },
          {
            foreignKeyName: "member_location_shares_region_country_fkey";
            columns: ["region_id", "country_code"];
            isOneToOne: false;
            referencedRelation: "geo_regions";
            referencedColumns: ["id", "country_code"];
          },
          {
            foreignKeyName: "member_location_shares_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      member_suspensions: {
        Row: {
          actor_id: string;
          id: string;
          lifted_at: string | null;
          lifted_by: string | null;
          reason: string;
          suspended_at: string;
          user_id: string;
        };
        Insert: {
          actor_id: string;
          id?: string;
          lifted_at?: string | null;
          lifted_by?: string | null;
          reason: string;
          suspended_at?: string;
          user_id: string;
        };
        Update: {
          actor_id?: string;
          id?: string;
          lifted_at?: string | null;
          lifted_by?: string | null;
          reason?: string;
          suspended_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      mentor_sessions: {
        Row: {
          booker_id: string;
          client_request_id: string | null;
          created_at: string;
          duration_mins: number;
          expert_id: string;
          id: string;
          meeting_url: string | null;
          message: string;
          scheduled_for: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          booker_id: string;
          client_request_id?: string | null;
          created_at?: string;
          duration_mins?: number;
          expert_id: string;
          id?: string;
          meeting_url?: string | null;
          message: string;
          scheduled_for?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          booker_id?: string;
          client_request_id?: string | null;
          created_at?: string;
          duration_mins?: number;
          expert_id?: string;
          id?: string;
          meeting_url?: string | null;
          message?: string;
          scheduled_for?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mentor_sessions_booker_id_fkey";
            columns: ["booker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "mentor_sessions_expert_id_fkey";
            columns: ["expert_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      mission_members: {
        Row: {
          client_request_id: string | null;
          commitment_type: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          invited_by: string | null;
          left_at: string | null;
          membership_state: string;
          message: string | null;
          mission_id: string;
          removal_reason: string | null;
          requested_at: string | null;
          role: string;
          state_version: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          client_request_id?: string | null;
          commitment_type?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          invited_by?: string | null;
          left_at?: string | null;
          membership_state?: string;
          message?: string | null;
          mission_id: string;
          removal_reason?: string | null;
          requested_at?: string | null;
          role: string;
          state_version?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          client_request_id?: string | null;
          commitment_type?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          invited_by?: string | null;
          left_at?: string | null;
          membership_state?: string;
          message?: string | null;
          mission_id?: string;
          removal_reason?: string | null;
          requested_at?: string | null;
          role?: string;
          state_version?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mission_members_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "mission_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "mission_members_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mission_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      mission_updates: {
        Row: {
          author_id: string;
          client_request_id: string | null;
          content: string;
          created_at: string;
          id: string;
          is_pinned: boolean | null;
          mission_id: string;
        };
        Insert: {
          author_id: string;
          client_request_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean | null;
          mission_id: string;
        };
        Update: {
          author_id?: string;
          client_request_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean | null;
          mission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mission_updates_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "mission_updates_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      missions: {
        Row: {
          activated_at: string | null;
          archived_at: string | null;
          chapter_id: string | null;
          client_request_id: string | null;
          completed_at: string | null;
          country_code: string | null;
          created_at: string;
          created_by: string;
          decision_reason: string | null;
          description: string;
          id: string;
          join_policy: string;
          lifecycle_state: string;
          max_members: number | null;
          place_id: string | null;
          region_id: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          risk_classification: string;
          state_version: number;
          status: string;
          submitted_at: string | null;
          template_key: string | null;
          template_version: number | null;
          theme: string;
          title: string;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          activated_at?: string | null;
          archived_at?: string | null;
          chapter_id?: string | null;
          client_request_id?: string | null;
          completed_at?: string | null;
          country_code?: string | null;
          created_at?: string;
          created_by: string;
          decision_reason?: string | null;
          description: string;
          id?: string;
          join_policy?: string;
          lifecycle_state?: string;
          max_members?: number | null;
          place_id?: string | null;
          region_id?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          risk_classification?: string;
          state_version?: number;
          status?: string;
          submitted_at?: string | null;
          template_key?: string | null;
          template_version?: number | null;
          theme: string;
          title: string;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          activated_at?: string | null;
          archived_at?: string | null;
          chapter_id?: string | null;
          client_request_id?: string | null;
          completed_at?: string | null;
          country_code?: string | null;
          created_at?: string;
          created_by?: string;
          decision_reason?: string | null;
          description?: string;
          id?: string;
          join_policy?: string;
          lifecycle_state?: string;
          max_members?: number | null;
          place_id?: string | null;
          region_id?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          risk_classification?: string;
          state_version?: number;
          status?: string;
          submitted_at?: string | null;
          template_key?: string | null;
          template_version?: number | null;
          theme?: string;
          title?: string;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "missions_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "missions_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "geo_countries";
            referencedColumns: ["country_code"];
          },
          {
            foreignKeyName: "missions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "missions_place_id_fkey";
            columns: ["place_id"];
            isOneToOne: false;
            referencedRelation: "geo_places";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "missions_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "geo_regions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "missions_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      newsletter_subscriptions: {
        Row: {
          created_at: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          category: string | null;
          created_at: string;
          id: string;
          is_read: boolean;
          link: string | null;
          message: string;
          type: string;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message: string;
          type: string;
          user_id: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          message?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          booking_url: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          display_name: string | null;
          headline: string | null;
          id: string;
          is_public: boolean;
          is_verified: boolean;
          linkedin_url: string | null;
          notification_prefs: Json | null;
          orbit_segment: Database["public"]["Enums"]["orbit_segment"] | null;
          region: string | null;
          segment_details: Json;
          segment_details_text: string | null;
          timezone: string | null;
          updated_at: string;
          user_id: string;
          verified_at: string | null;
          verified_by: string | null;
          website_url: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          booking_url?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          display_name?: string | null;
          headline?: string | null;
          id?: string;
          is_public?: boolean;
          is_verified?: boolean;
          linkedin_url?: string | null;
          notification_prefs?: Json | null;
          orbit_segment?: Database["public"]["Enums"]["orbit_segment"] | null;
          region?: string | null;
          segment_details?: Json;
          segment_details_text?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id: string;
          verified_at?: string | null;
          verified_by?: string | null;
          website_url?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          booking_url?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          display_name?: string | null;
          headline?: string | null;
          id?: string;
          is_public?: boolean;
          is_verified?: boolean;
          linkedin_url?: string | null;
          notification_prefs?: Json | null;
          orbit_segment?: Database["public"]["Enums"]["orbit_segment"] | null;
          region?: string | null;
          segment_details?: Json;
          segment_details_text?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          website_url?: string | null;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          answers: Json;
          created_at: string;
          id: string;
          passed: boolean;
          quiz_id: string;
          score: number;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          created_at?: string;
          id?: string;
          passed?: boolean;
          quiz_id: string;
          score: number;
          user_id: string;
        };
        Update: {
          answers?: Json;
          created_at?: string;
          id?: string;
          passed?: boolean;
          quiz_id?: string;
          score?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_options: {
        Row: {
          id: string;
          is_correct: boolean;
          label: string;
          question_id: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          is_correct?: boolean;
          label: string;
          question_id: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          is_correct?: boolean;
          label?: string;
          question_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          created_at: string;
          id: string;
          prompt: string;
          quiz_id: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          prompt: string;
          quiz_id: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          prompt?: string;
          quiz_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
        ];
      };
      quizzes: {
        Row: {
          created_at: string;
          id: string;
          lesson_id: string;
          passing_score: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lesson_id: string;
          passing_score?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lesson_id?: string;
          passing_score?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: true;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          reason: string;
          reporter_id: string;
          resolution_note: string | null;
          resolved_at: string | null;
          resolver_id: string | null;
          status: string;
          target_id: string;
          target_type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason: string;
          reporter_id: string;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolver_id?: string | null;
          status?: string;
          target_id: string;
          target_type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string;
          reporter_id?: string;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolver_id?: string | null;
          status?: string;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          category: string | null;
          chapter_id: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          file_name: string | null;
          file_path: string | null;
          id: string;
          kind: string;
          mime_type: string | null;
          status: string;
          tags: string[];
          title: string;
          updated_at: string;
          url: string | null;
        };
        Insert: {
          category?: string | null;
          chapter_id?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          kind: string;
          mime_type?: string | null;
          status?: string;
          tags?: string[];
          title: string;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          category?: string | null;
          chapter_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          kind?: string;
          mime_type?: string | null;
          status?: string;
          tags?: string[];
          title?: string;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      skills: {
        Row: {
          badges: string[];
          category: string;
          common_pitfalls: string | null;
          cost_estimate: string | null;
          created_at: string;
          created_by: string | null;
          featured_on: string | null;
          hero_image_url: string | null;
          id: string;
          india_context_notes: string | null;
          legal_refs: string[];
          prerequisites: Json;
          published_at: string | null;
          referenced_tools: string[];
          score_clarity: number;
          score_completeness: number;
          score_freshness: number;
          score_india_fit: number;
          slug: string;
          status: string;
          steps: Json;
          summary: string | null;
          tags: string[];
          templates: Json;
          time_estimate: string | null;
          title: string;
          updated_at: string;
          when_to_use: string | null;
        };
        Insert: {
          badges?: string[];
          category?: string;
          common_pitfalls?: string | null;
          cost_estimate?: string | null;
          created_at?: string;
          created_by?: string | null;
          featured_on?: string | null;
          hero_image_url?: string | null;
          id?: string;
          india_context_notes?: string | null;
          legal_refs?: string[];
          prerequisites?: Json;
          published_at?: string | null;
          referenced_tools?: string[];
          score_clarity?: number;
          score_completeness?: number;
          score_freshness?: number;
          score_india_fit?: number;
          slug: string;
          status?: string;
          steps?: Json;
          summary?: string | null;
          tags?: string[];
          templates?: Json;
          time_estimate?: string | null;
          title: string;
          updated_at?: string;
          when_to_use?: string | null;
        };
        Update: {
          badges?: string[];
          category?: string;
          common_pitfalls?: string | null;
          cost_estimate?: string | null;
          created_at?: string;
          created_by?: string | null;
          featured_on?: string | null;
          hero_image_url?: string | null;
          id?: string;
          india_context_notes?: string | null;
          legal_refs?: string[];
          prerequisites?: Json;
          published_at?: string | null;
          referenced_tools?: string[];
          score_clarity?: number;
          score_completeness?: number;
          score_freshness?: number;
          score_india_fit?: number;
          slug?: string;
          status?: string;
          steps?: Json;
          summary?: string | null;
          tags?: string[];
          templates?: Json;
          time_estimate?: string | null;
          title?: string;
          updated_at?: string;
          when_to_use?: string | null;
        };
        Relationships: [];
      };
      soda_ideas: {
        Row: {
          badges: string[];
          business_fit: Json;
          community_signals: Json;
          created_at: string;
          created_by: string | null;
          execution_plan: string | null;
          featured_on: string | null;
          framework_fit: Json;
          growth_pct: number | null;
          hero_image_url: string | null;
          id: string;
          keyword: string | null;
          main_competitor: string | null;
          market_gap: string | null;
          market_label: string | null;
          offer: Json;
          published_at: string | null;
          score_feasibility: number | null;
          score_opportunity: number | null;
          score_problem: number | null;
          score_why_now: number | null;
          sector: string;
          slug: string;
          status: string;
          summary: string | null;
          tagline: string | null;
          tags: string[];
          target_label: string | null;
          title: string;
          top_keywords: Json;
          trend_analysis: string | null;
          type_label: string | null;
          updated_at: string;
          volume: number | null;
          why_now: string | null;
        };
        Insert: {
          badges?: string[];
          business_fit?: Json;
          community_signals?: Json;
          created_at?: string;
          created_by?: string | null;
          execution_plan?: string | null;
          featured_on?: string | null;
          framework_fit?: Json;
          growth_pct?: number | null;
          hero_image_url?: string | null;
          id?: string;
          keyword?: string | null;
          main_competitor?: string | null;
          market_gap?: string | null;
          market_label?: string | null;
          offer?: Json;
          published_at?: string | null;
          score_feasibility?: number | null;
          score_opportunity?: number | null;
          score_problem?: number | null;
          score_why_now?: number | null;
          sector?: string;
          slug: string;
          status?: string;
          summary?: string | null;
          tagline?: string | null;
          tags?: string[];
          target_label?: string | null;
          title: string;
          top_keywords?: Json;
          trend_analysis?: string | null;
          type_label?: string | null;
          updated_at?: string;
          volume?: number | null;
          why_now?: string | null;
        };
        Update: {
          badges?: string[];
          business_fit?: Json;
          community_signals?: Json;
          created_at?: string;
          created_by?: string | null;
          execution_plan?: string | null;
          featured_on?: string | null;
          framework_fit?: Json;
          growth_pct?: number | null;
          hero_image_url?: string | null;
          id?: string;
          keyword?: string | null;
          main_competitor?: string | null;
          market_gap?: string | null;
          market_label?: string | null;
          offer?: Json;
          published_at?: string | null;
          score_feasibility?: number | null;
          score_opportunity?: number | null;
          score_problem?: number | null;
          score_why_now?: number | null;
          sector?: string;
          slug?: string;
          status?: string;
          summary?: string | null;
          tagline?: string | null;
          tags?: string[];
          target_label?: string | null;
          title?: string;
          top_keywords?: Json;
          trend_analysis?: string | null;
          type_label?: string | null;
          updated_at?: string;
          volume?: number | null;
          why_now?: string | null;
        };
        Relationships: [];
      };
      spotlights: {
        Row: {
          created_at: string;
          display_order: number;
          featured_by: string;
          headline: string | null;
          id: string;
          is_active: boolean;
          link: string | null;
          updated_at: string;
          user_id: string;
          writeup: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          featured_by: string;
          headline?: string | null;
          id?: string;
          is_active?: boolean;
          link?: string | null;
          updated_at?: string;
          user_id: string;
          writeup: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          featured_by?: string;
          headline?: string | null;
          id?: string;
          is_active?: boolean;
          link?: string | null;
          updated_at?: string;
          user_id?: string;
          writeup?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spotlights_featured_by_fkey";
            columns: ["featured_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "spotlights_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      stories: {
        Row: {
          author_id: string;
          chapter_id: string | null;
          content: string;
          created_at: string;
          id: string;
          mission_id: string | null;
          published_at: string | null;
          status: string;
          title: string;
        };
        Insert: {
          author_id: string;
          chapter_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          mission_id?: string | null;
          published_at?: string | null;
          status?: string;
          title: string;
        };
        Update: {
          author_id?: string;
          chapter_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          mission_id?: string | null;
          published_at?: string | null;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "stories_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stories_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      verification_decisions: {
        Row: {
          actor_id: string;
          created_at: string;
          decision: string;
          id: string;
          profile_id: string;
          reason: string | null;
        };
        Insert: {
          actor_id: string;
          created_at?: string;
          decision: string;
          id?: string;
          profile_id: string;
          reason?: string | null;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          decision?: string;
          id?: string;
          profile_id?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      vouch_codes: {
        Row: {
          code: string;
          created_at: string;
          expires_at: string;
          id: string;
          issuer_id: string;
          redeemed_at: string | null;
          redeemer_id: string | null;
          status: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          issuer_id: string;
          redeemed_at?: string | null;
          redeemer_id?: string | null;
          status?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          issuer_id?: string;
          redeemed_at?: string | null;
          redeemer_id?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      vouch_events: {
        Row: {
          channel: string;
          code_id: string | null;
          created_at: string;
          id: string;
          issuer_id: string;
          recipient_id: string | null;
        };
        Insert: {
          channel: string;
          code_id?: string | null;
          created_at?: string;
          id?: string;
          issuer_id: string;
          recipient_id?: string | null;
        };
        Update: {
          channel?: string;
          code_id?: string | null;
          created_at?: string;
          id?: string;
          issuer_id?: string;
          recipient_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vouch_events_code_id_fkey";
            columns: ["code_id"];
            isOneToOne: false;
            referencedRelation: "vouch_codes";
            referencedColumns: ["id"];
          },
        ];
      };
      vouch_requests: {
        Row: {
          client_request_id: string | null;
          created_at: string;
          id: string;
          message: string;
          requester_id: string;
          responded_at: string | null;
          status: string;
          target_verifier_id: string | null;
        };
        Insert: {
          client_request_id?: string | null;
          created_at?: string;
          id?: string;
          message: string;
          requester_id: string;
          responded_at?: string | null;
          status?: string;
          target_verifier_id?: string | null;
        };
        Update: {
          client_request_id?: string | null;
          created_at?: string;
          id?: string;
          message?: string;
          requester_id?: string;
          responded_at?: string | null;
          status?: string;
          target_verifier_id?: string | null;
        };
        Relationships: [];
      };
      vouch_role_overrides: {
        Row: {
          id: string;
          quota: number;
          role: Database["public"]["Enums"]["app_role"];
          segment: Database["public"]["Enums"]["orbit_segment"] | null;
          segment_key: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          quota: number;
          role: Database["public"]["Enums"]["app_role"];
          segment?: Database["public"]["Enums"]["orbit_segment"] | null;
          segment_key: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          quota?: number;
          role?: Database["public"]["Enums"]["app_role"];
          segment?: Database["public"]["Enums"]["orbit_segment"] | null;
          segment_key?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      vouch_settings: {
        Row: {
          code_ttl_days: number;
          default_quota: number;
          id: string;
          updated_at: string;
          updated_by: string | null;
          window_days: number;
        };
        Insert: {
          code_ttl_days?: number;
          default_quota?: number;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
          window_days?: number;
        };
        Update: {
          code_ttl_days?: number;
          default_quota?: number;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
          window_days?: number;
        };
        Relationships: [];
      };
      vouch_user_overrides: {
        Row: {
          quota: number;
          reason: string | null;
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          quota: number;
          reason?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          quota?: number;
          reason?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      io_api_key_metadata: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          environment_id: string | null;
          expires_at: string | null;
          hash_algorithm: string | null;
          hash_version: number | null;
          id: string | null;
          key_prefix: string | null;
          last_four: string | null;
          last_used_at: string | null;
          limit_policy_version: number | null;
          name: string | null;
          project_id: string | null;
          requests_per_day: number | null;
          requests_per_minute: number | null;
          requests_per_month: number | null;
          revoked_at: string | null;
          scopes: string[] | null;
          spend_currency_code: string | null;
          spend_per_day_nanos: number | null;
          spend_per_month_nanos: number | null;
          status: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          environment_id?: string | null;
          expires_at?: string | null;
          hash_algorithm?: string | null;
          hash_version?: number | null;
          id?: string | null;
          key_prefix?: string | null;
          last_four?: string | null;
          last_used_at?: string | null;
          limit_policy_version?: number | null;
          name?: string | null;
          project_id?: string | null;
          requests_per_day?: number | null;
          requests_per_minute?: number | null;
          requests_per_month?: number | null;
          revoked_at?: string | null;
          scopes?: string[] | null;
          spend_currency_code?: string | null;
          spend_per_day_nanos?: number | null;
          spend_per_month_nanos?: number | null;
          status?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          environment_id?: string | null;
          expires_at?: string | null;
          hash_algorithm?: string | null;
          hash_version?: number | null;
          id?: string | null;
          key_prefix?: string | null;
          last_four?: string | null;
          last_used_at?: string | null;
          limit_policy_version?: number | null;
          name?: string | null;
          project_id?: string | null;
          requests_per_day?: number | null;
          requests_per_minute?: number | null;
          requests_per_month?: number | null;
          revoked_at?: string | null;
          scopes?: string[] | null;
          spend_currency_code?: string | null;
          spend_per_day_nanos?: number | null;
          spend_per_month_nanos?: number | null;
          status?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "io_api_keys_environment_project_workspace_fkey";
            columns: ["environment_id", "project_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_environments";
            referencedColumns: ["id", "project_id", "workspace_id"];
          },
          {
            foreignKeyName: "io_api_keys_project_workspace_fkey";
            columns: ["project_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_projects";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "io_api_keys_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "io_workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      admin_appeal_queue: {
        Args: { _limit?: number; _status?: string };
        Returns: {
          action_reason: string;
          action_type: string;
          appeal_id: string;
          appeal_reason: string;
          appeal_status: string;
          appeal_version: number;
          assigned_to_me: boolean;
          notice_id: string;
          submitted_at: string;
          target_id: string;
          target_type: string;
        }[];
      };
      admin_assign_appeal: {
        Args: { _appeal_id: string; _expected_version: number; _reason: string };
        Returns: Json;
      };
      admin_assign_trust_case: {
        Args: {
          _expected_version?: number;
          _priority: string;
          _report_id: string;
          _source_kind: string;
          _triage_note: string;
        };
        Returns: Json;
      };
      admin_attachment_review_queue: {
        Args: { _limit?: number; _scan_status?: string };
        Returns: {
          attachment_id: string;
          byte_size: number;
          content_sha256: string;
          content_type: string;
          created_at: string;
          file_name: string;
          message_id: string;
          review_note: string;
          review_version: number;
          scan_finished_at: string;
          scan_provider: string;
          scan_status: string;
          scanner_reference: string;
          threat_code: string;
        }[];
      };
      admin_decide_appeal: {
        Args: {
          _appeal_id: string;
          _decision_note: string;
          _expected_version: number;
          _outcome: string;
        };
        Returns: Json;
      };
      admin_decide_trust_case: {
        Args: {
          _client_request_id: string;
          _expected_status: string;
          _moderation_action: string;
          _outcome: string;
          _reason: string;
          _report_id: string;
          _source_kind: string;
        };
        Returns: Json;
      };
      admin_io_approve_fx_rate: {
        Args: { _rate_id: string; _reason: string };
        Returns: Json;
      };
      admin_io_approve_payment_processor: {
        Args: { _config_id: string; _reason: string };
        Returns: Json;
      };
      admin_io_approve_tax_policy: {
        Args: { _policy_id: string; _reason: string };
        Returns: Json;
      };
      admin_io_begin_provider_conformance: {
        Args: {
          _acknowledge_external_processing: boolean;
          _endpoint_id: string;
          _max_provider_cost_nanos: number;
          _reason: string;
        };
        Returns: Json;
      };
      admin_io_budget_snapshot: {
        Args: never;
        Returns: {
          budget_status: string;
          currency_code: string;
          hard_limit_minor: string;
          period_end: string;
          period_start: string;
          remaining_minor: string;
          reserved_minor: string;
          spent_minor: string;
          workspace_id: string;
          workspace_name: string;
        }[];
      };
      admin_io_create_draft_invoice: {
        Args: {
          _currency_code: string;
          _period_end: string;
          _period_start: string;
          _workspace_id: string;
        };
        Returns: Json;
      };
      admin_io_create_fx_draft_invoice: {
        Args: {
          _fx_rate_version_id: string;
          _period_end: string;
          _period_start: string;
          _reason: string;
          _settlement_currency_code: string;
          _source_currency_code: string;
          _workspace_id: string;
        };
        Returns: Json;
      };
      admin_io_create_fx_rate_draft: {
        Args: {
          _base_currency_code: string;
          _effective_from: string;
          _effective_until: string;
          _evidence_url: string;
          _observed_at: string;
          _quote_currency_code: string;
          _rate_denominator: number;
          _rate_numerator: number;
          _reason: string;
          _source_name: string;
        };
        Returns: Json;
      };
      admin_io_create_tax_policy_draft: {
        Args: { _policy: Json; _reason: string };
        Returns: Json;
      };
      admin_io_endpoint_health_snapshot: {
        Args: never;
        Returns: {
          circuit_state: string;
          consecutive_failures: number;
          endpoint_id: string;
          endpoint_key: string;
          health_state: string;
          latency_ms: number;
          observed_at: string;
          provider_id: string;
          provider_key: string;
          retry_after: string;
        }[];
      };
      admin_io_evidence_summary: { Args: never; Returns: Json };
      admin_io_finance_snapshot: { Args: never; Returns: Json };
      admin_io_import_provider_statement: {
        Args: {
          _content_sha256: string;
          _currency_code: string;
          _evidence_url: string;
          _lines: Json;
          _period_end: string;
          _period_start: string;
          _provider_id: string;
          _reason: string;
          _stated_total_nanos: number;
          _statement_number: string;
        };
        Returns: Json;
      };
      admin_io_issue_invoice: {
        Args: {
          _due_days: number;
          _invoice_id: string;
          _reason: string;
          _tax_policy_id: string;
        };
        Returns: Json;
      };
      admin_io_operational_snapshot: {
        Args: never;
        Returns: {
          activation_eligible: boolean;
          capability_state: string;
          capacity_mode: string;
          connection_state: string;
          currency_code: string;
          disabled_reason: string;
          endpoint_id: string;
          endpoint_key: string;
          endpoint_routing_state: string;
          integration_style: string;
          latest_conformance_state: string;
          model_display_name: string;
          price_state: string;
          provider_display_name: string;
          provider_id: string;
          provider_key: string;
          provider_lifecycle_state: string;
          routing_enabled: boolean;
          supports_chat: boolean;
          updated_at: string;
        }[];
      };
      admin_io_payment_queue: { Args: { _limit?: number }; Returns: Json };
      admin_io_post_credit: {
        Args: {
          _amount_nanos: number;
          _currency_code: string;
          _entry_kind: string;
          _external_reference: string;
          _reason: string;
          _workspace_id: string;
        };
        Returns: Json;
      };
      admin_io_provider_commercial_snapshot: {
        Args: never;
        Returns: {
          commercial_access_state: string;
          commercial_terms_evidence_url: string;
          commercial_terms_reviewed_at: string;
          provider_id: string;
          provider_key: string;
          resale_authorized: boolean;
        }[];
      };
      admin_io_provider_conformance_snapshot: {
        Args: never;
        Returns: {
          discovery_state: string;
          endpoint_id: string;
          finished_at: string;
          model_name: string;
          provider_cost_nanos: number;
          provider_key: string;
          residency_country_code: string;
          run_id: string;
          run_state: string;
          started_at: string;
          suite_version: string;
        }[];
      };
      admin_io_recent_route_receipts: {
        Args: {
          _before_created_at?: string;
          _before_id?: string;
          _limit?: number;
        };
        Returns: {
          attempt_count: number;
          candidate_count: number;
          capacity_mode: string;
          completed_at: string;
          created_at: string;
          currency_code: string;
          estimated_cost_nanos: string;
          failed_attempt_count: number;
          fallback_count: number;
          input_tokens: number;
          model_key: string;
          output_tokens: number;
          provider_key: string;
          receipt_id: string;
          region_code: string;
          request_id: string;
          residency_country_code: string;
          result_state: string;
          retention_class: string;
          route_strategy: string;
        }[];
      };
      admin_io_reconcile_provider_statement: {
        Args: { _reason: string; _statement_id: string };
        Returns: Json;
      };
      admin_io_register_payment_processor: {
        Args: {
          _currency_codes: string[];
          _environment: string;
          _merchant_reference: string;
          _provider_key: string;
          _reason: string;
          _refund_policy_url: string;
          _terms_evidence_url: string;
        };
        Returns: Json;
      };
      admin_io_request_refund: {
        Args: {
          _amount_nanos: number;
          _client_request_id: string;
          _payment_intent_id: string;
          _reason: string;
        };
        Returns: Json;
      };
      admin_io_set_endpoint_circuit: {
        Args: {
          _circuit_state: string;
          _endpoint_id: string;
          _reason: string;
          _retry_after?: string;
        };
        Returns: Json;
      };
      admin_io_set_provider_routing: {
        Args: { _enabled: boolean; _provider_id: string; _reason: string };
        Returns: Json;
      };
      admin_io_set_workspace_budget: {
        Args: {
          _currency_code: string;
          _hard_limit_minor: number;
          _period_end: string;
          _period_start: string;
          _reason: string;
          _workspace_id: string;
        };
        Returns: Json;
      };
      admin_io_verify_billing_profile: {
        Args: {
          _expected_version: number;
          _reason: string;
          _workspace_id: string;
        };
        Returns: Json;
      };
      admin_list_team_members: {
        Args: never;
        Returns: {
          capabilities: string[];
          display_name: string;
          headline: string;
          is_super_admin: boolean;
          roles: string[];
          user_id: string;
        }[];
      };
      admin_member_search: {
        Args: { _limit?: number; _query: string };
        Returns: {
          display_name: string;
          headline: string;
          is_public: boolean;
          is_suspended: boolean;
          is_verified: boolean;
          orbit_segment: string;
          suspended_at: string;
          user_id: string;
        }[];
      };
      admin_operation_event_queue: {
        Args: {
          _before_id?: number;
          _before_occurred_at?: string;
          _domains?: string[];
          _limit?: number;
        };
        Returns: {
          action: string;
          actor_display_name: string;
          capability: string;
          domain: string;
          event_id: number;
          metadata: Json;
          occurred_at: string;
          reason: string;
          target_id: string;
          target_type: string;
        }[];
      };
      admin_report_queue: {
        Args: {
          _before_created_at?: string;
          _before_id?: string;
          _limit?: number;
        };
        Returns: {
          created_at: string;
          report_id: string;
          report_reason: string;
          report_status: string;
          resolution_note: string;
          resolved_at: string;
          target_id: string;
          target_type: string;
        }[];
      };
      admin_resolve_report: {
        Args: {
          _expected_status?: string;
          _outcome: string;
          _reason: string;
          _report_id: string;
        };
        Returns: Json;
      };
      admin_resolve_vouch_request: {
        Args: { _approve: boolean; _reason?: string; _request_id: string };
        Returns: undefined;
      };
      admin_review_conversation_attachment: {
        Args: {
          _attachment_id: string;
          _decision: string;
          _expected_status: string;
          _expected_version: number;
          _reason: string;
        };
        Returns: Json;
      };
      admin_search_members: {
        Args: { _limit?: number; _query: string };
        Returns: {
          display_name: string;
          headline: string;
          user_id: string;
        }[];
      };
      admin_set_member_suspension: {
        Args: {
          _expected_suspended: boolean;
          _reason: string;
          _suspended: boolean;
          _target_user_id: string;
        };
        Returns: Json;
      };
      admin_set_member_verification: {
        Args: {
          _expected_verified: boolean;
          _reason: string;
          _target_user_id: string;
          _verified: boolean;
        };
        Returns: Json;
      };
      admin_set_team_role: {
        Args: {
          _enabled: boolean;
          _reason: string;
          _role: string;
          _target_user_id: string;
        };
        Returns: Json;
      };
      admin_trust_case_queue: {
        Args: {
          _assigned_to_me?: boolean;
          _before_created_at?: string;
          _before_id?: string;
          _limit?: number;
          _source_kind?: string;
          _status?: string;
        };
        Returns: {
          assigned_display_name: string;
          assigned_to_me: boolean;
          case_version: number;
          category: string;
          context_excerpt: string;
          created_at: string;
          priority: string;
          report_id: string;
          report_reason: string;
          report_status: string;
          resolution_note: string;
          resolved_at: string;
          source_kind: string;
          target_id: string;
          target_type: string;
          triage_note: string;
        }[];
      };
      append_my_io_terminal_event: {
        Args: {
          _event_key: string;
          _event_type: string;
          _payload?: Json;
          _session_id: string;
        };
        Returns: {
          event_id: number;
          event_type: string;
          occurred_at: string;
          replayed: boolean;
          sequence: number;
        }[];
      };
      approve_chapter_proposal: {
        Args: { _proposal_id: string };
        Returns: string;
      };
      block_my_member: {
        Args: { _blocked_user_id: string; _reason_category?: string };
        Returns: {
          blocked_user_id: string;
          blocker_id: string;
          created_at: string;
          reason_category: string;
        };
        SetofOptions: {
          from: "*";
          to: "member_blocks";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      can_author_education: { Args: { _user_id: string }; Returns: boolean };
      claim_email_delivery_batch: {
        Args: { _limit?: number };
        Returns: {
          id: string;
          lease_token: string;
          recipient_email: string;
          template_data: Json;
          template_key: string;
        }[];
      };
      complete_email_delivery: {
        Args: {
          _error?: string;
          _id: string;
          _lease_token: string;
          _provider_message_id?: string;
          _succeeded: boolean;
        };
        Returns: undefined;
      };
      complete_my_community_onboarding: {
        Args: { _client_operation_id: string; _version: number };
        Returns: {
          community_access: boolean;
          community_current_step: string;
          community_status: string;
          community_version: number;
          io_access: boolean;
          measurement_consent: boolean;
        }[];
      };
      complete_my_io_terminal_session: {
        Args: { _session_id: string; _state: string };
        Returns: {
          completed_at: string | null;
          connector_kind: string;
          connector_origin_hash: string;
          created_at: string;
          created_by: string;
          execution_location: string;
          id: string;
          last_event_sequence: number;
          mode: string;
          parent_session_id: string | null;
          runtime_reference_hash: string;
          runtime_version: string | null;
          started_at: string;
          state: string;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "io_terminal_sessions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_managed_chapter: {
        Args: {
          _city: string;
          _client_request_id: string;
          _country: string;
          _description: string;
          _join_policy: string;
          _name: string;
          _visibility: string;
        };
        Returns: {
          activated_at: string | null;
          archived_at: string | null;
          city: string | null;
          client_request_id: string | null;
          country: string | null;
          country_code: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          join_policy: string;
          lifecycle_state: string;
          name: string;
          paused_at: string | null;
          place_id: string | null;
          region_id: string | null;
          source_proposal_id: string | null;
          state_version: number;
          updated_at: string;
          visibility: string;
        };
        SetofOptions: {
          from: "*";
          to: "chapters";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_my_chapter_proposal: {
        Args: {
          _city: string;
          _client_request_id: string;
          _country: string;
          _country_code: string;
          _expected_size: number;
          _join_policy: string;
          _proposed_name: string;
          _proposer_background: string;
          _rationale: string;
          _target_audience: string;
          _visibility: string;
        };
        Returns: {
          approved_chapter_id: string | null;
          city: string | null;
          client_request_id: string | null;
          country: string | null;
          country_code: string | null;
          created_at: string | null;
          decision_reason: string | null;
          expected_size: number | null;
          id: string;
          join_policy: string;
          place_id: string | null;
          proposed_name: string;
          proposed_stewards: Json;
          proposer_background: string;
          proposer_id: string;
          rationale: string;
          region_id: string | null;
          requested_information: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          state_version: number;
          status: string | null;
          submitted_at: string | null;
          target_audience: string | null;
          updated_at: string;
          visibility: string;
        };
        SetofOptions: {
          from: "*";
          to: "chapter_proposals";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_my_connection_request: {
        Args: {
          _client_request_id: string;
          _note: string;
          _reason: string;
          _recipient_id: string;
        };
        Returns: {
          client_request_id: string | null;
          created_at: string;
          id: string;
          note: string;
          reason: string;
          recipient_id: string;
          responded_at: string | null;
          sender_id: string;
          status: string;
        };
        SetofOptions: {
          from: "*";
          to: "connection_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_my_conversation_thread: {
        Args: {
          _client_request_id: string;
          _parent_message_id: string;
          _room_id: string;
          _title: string;
          _visibility: string;
        };
        Returns: {
          archived_at: string | null;
          client_request_id: string | null;
          created_at: string;
          created_by: string;
          id: string;
          locked_at: string | null;
          parent_message_id: string | null;
          room_id: string;
          title: string | null;
          updated_at: string;
          visibility: string;
        };
        SetofOptions: {
          from: "*";
          to: "conversation_threads";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_my_io_payment_intent: {
        Args: { _client_request_id: string; _invoice_id: string };
        Returns: Json;
      };
      create_my_io_terminal_session: {
        Args: {
          _connector_origin: string;
          _mode: string;
          _runtime_reference: string;
          _runtime_version?: string;
          _title: string;
          _workspace_id: string;
        };
        Returns: {
          completed_at: string | null;
          connector_kind: string;
          connector_origin_hash: string;
          created_at: string;
          created_by: string;
          execution_location: string;
          id: string;
          last_event_sequence: number;
          mode: string;
          parent_session_id: string | null;
          runtime_reference_hash: string;
          runtime_version: string | null;
          started_at: string;
          state: string;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "io_terminal_sessions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_my_io_test_api_key: {
        Args: {
          _expires_at?: string;
          _name: string;
          _scopes?: string[];
          _workspace_id: string;
        };
        Returns: Json;
      };
      create_my_io_workspace: {
        Args: never;
        Returns: {
          chapter_id: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          mission_id: string | null;
          name: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "io_workspaces";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_my_mission: {
        Args: {
          _chapter_id: string;
          _client_request_id: string;
          _description: string;
          _join_policy: string;
          _theme: string;
          _title: string;
          _visibility: string;
        };
        Returns: {
          activated_at: string | null;
          archived_at: string | null;
          chapter_id: string | null;
          client_request_id: string | null;
          completed_at: string | null;
          country_code: string | null;
          created_at: string;
          created_by: string;
          decision_reason: string | null;
          description: string;
          id: string;
          join_policy: string;
          lifecycle_state: string;
          max_members: number | null;
          place_id: string | null;
          region_id: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          risk_classification: string;
          state_version: number;
          status: string;
          submitted_at: string | null;
          template_key: string | null;
          template_version: number | null;
          theme: string;
          title: string;
          updated_at: string;
          visibility: string;
        };
        SetofOptions: {
          from: "*";
          to: "missions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      decide_my_io_terminal_approval: {
        Args: { _decision: string; _reason: string; _request_id: string };
        Returns: Json;
      };
      decide_space_membership: {
        Args: {
          _decision: string;
          _expected_version: number;
          _reason: string;
          _role: string;
          _space_id: string;
          _target_user_id: string;
        };
        Returns: Json;
      };
      event_rsvp_counts: { Args: { _event_id: string }; Returns: Json };
      finalize_my_conversation_attachment: {
        Args: { _attachment_id: string };
        Returns: {
          alt_text: string | null;
          byte_size: number;
          content_sha256: string | null;
          content_type: string;
          created_at: string;
          file_name: string;
          id: string;
          message_id: string;
          review_note: string | null;
          review_version: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          scan_finished_at: string | null;
          scan_provider: string | null;
          scan_started_at: string | null;
          scan_status: string;
          scanner_reference: string | null;
          storage_bucket: string;
          storage_path: string;
          threat_code: string | null;
          uploaded_by: string;
        };
        SetofOptions: {
          from: "*";
          to: "conversation_attachments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_connection_email: {
        Args: { target_user_id: string };
        Returns: string;
      };
      get_my_admin_access: { Args: never; Returns: Json };
      get_my_io_billing_profile: {
        Args: { _workspace_id: string };
        Returns: Json;
      };
      get_my_io_billing_summary: {
        Args: { _workspace_id: string };
        Returns: Json;
      };
      get_my_io_budget_status: {
        Args: { _workspace_id: string };
        Returns: Json;
      };
      get_my_io_invoice_document: {
        Args: { _invoice_id: string };
        Returns: Json;
      };
      get_my_io_payment_verification_context: {
        Args: { _payment_intent_id: string };
        Returns: Json;
      };
      get_my_io_workspace_provider_policy: {
        Args: { _workspace_id: string };
        Returns: Json;
      };
      get_my_location_preferences: { Args: never; Returns: Json };
      get_my_product_access: {
        Args: never;
        Returns: {
          community_access: boolean;
          community_current_step: string;
          community_status: string;
          community_version: number;
          io_access: boolean;
          measurement_consent: boolean;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      io_begin_api_key_route_request: {
        Args: {
          _actor_user_id: string;
          _api_key_id: string;
          _currency_code: string;
          _endpoint_id: string;
          _idempotency_key: string;
          _request_fingerprint: string;
          _request_id: string;
          _reserve_customer_nanos: number;
          _reserve_minor: number;
          _workspace_id: string;
        };
        Returns: Json;
      };
      io_begin_route_request: {
        Args: {
          _actor_user_id: string;
          _currency_code: string;
          _endpoint_id: string;
          _idempotency_key: string;
          _request_fingerprint: string;
          _request_id: string;
          _reserve_minor: number;
          _workspace_id: string;
        };
        Returns: Json;
      };
      io_consume_api_key_request: {
        Args: {
          _key_hash_hex: string;
          _limit?: number;
          _required_scope: string;
        };
        Returns: Json;
      };
      io_finalize_api_key_priced_route_request: {
        Args: {
          _api_key_id: string;
          _attempts: Json;
          _candidate_count: number;
          _candidate_summary: Json;
          _currency_code: string;
          _customer_charge_minor: number;
          _customer_charge_nanos: number;
          _estimated_cost_nanos: number;
          _fallback_count: number;
          _input_tokens: number;
          _output_tokens: number;
          _policy_snapshot: Json;
          _provider_cost_nanos: number;
          _request_id: string;
          _result_state: string;
          _route_strategy: string;
          _selection: Json;
          _service_fee_basis_points: number;
          _service_fee_nanos: number;
          _service_fee_policy_version: number;
        };
        Returns: Json;
      };
      io_finalize_priced_route_request: {
        Args: {
          _attempts: Json;
          _candidate_count: number;
          _candidate_summary: Json;
          _currency_code: string;
          _customer_charge_minor: number;
          _customer_charge_nanos: number;
          _estimated_cost_nanos: number;
          _fallback_count: number;
          _input_tokens: number;
          _output_tokens: number;
          _policy_snapshot: Json;
          _provider_cost_nanos: number;
          _request_id: string;
          _result_state: string;
          _route_strategy: string;
          _selection: Json;
          _service_fee_basis_points: number;
          _service_fee_nanos: number;
          _service_fee_policy_version: number;
        };
        Returns: Json;
      };
      io_finalize_route_request: {
        Args: {
          _actual_cost_minor: number;
          _attempts: Json;
          _candidate_count: number;
          _candidate_summary: Json;
          _currency_code: string;
          _estimated_cost_nanos: number;
          _fallback_count: number;
          _input_tokens: number;
          _output_tokens: number;
          _policy_snapshot: Json;
          _request_id: string;
          _result_state: string;
          _route_strategy: string;
          _selection: Json;
        };
        Returns: Json;
      };
      io_finish_provider_conformance: {
        Args: {
          _discovery_state: string;
          _evidence_sha256: string;
          _provider_cost_nanos: number;
          _result_summary: Json;
          _run_id: string;
          _run_state: string;
        };
        Returns: Json;
      };
      io_get_active_service_fee_policy: { Args: never; Returns: Json };
      io_get_provider_conformance_connection: {
        Args: { _run_id: string };
        Returns: {
          auto_route_tier: string;
          capability_version: number;
          capacity_mode: string;
          capacity_source_id: string;
          circuit_state: string;
          currency_code: string;
          endpoint_base_url: string;
          endpoint_id: string;
          endpoint_key: string;
          health_state: string;
          input_price_nanos: number;
          integration_style: string;
          max_context_tokens: number;
          model_deprecation_at: string;
          model_display_name: string;
          model_id: string;
          model_release_date: string;
          output_price_nanos: number;
          price_version: number;
          provider_display_name: string;
          provider_id: string;
          provider_key: string;
          provider_model_id: string;
          region_code: string;
          residency_country_code: string;
          retention_class: string;
          secret_reference: string;
          unit_quantity: number;
        }[];
      };
      io_get_ready_endpoint_connections: {
        Args: never;
        Returns: {
          auto_route_tier: string;
          capability_version: number;
          capacity_mode: string;
          capacity_source_id: string;
          currency_code: string;
          endpoint_base_url: string;
          endpoint_id: string;
          endpoint_key: string;
          input_price_nanos: number;
          integration_style: string;
          max_context_tokens: number;
          model_deprecation_at: string;
          model_display_name: string;
          model_id: string;
          model_release_date: string;
          output_price_nanos: number;
          price_version: number;
          provider_display_name: string;
          provider_id: string;
          provider_key: string;
          provider_model_id: string;
          region_code: string;
          residency_country_code: string;
          retention_class: string;
          secret_reference: string;
          unit_quantity: number;
        }[];
      };
      io_get_routable_endpoint_connections_v2: {
        Args: never;
        Returns: {
          auto_route_tier: string;
          capability_version: number;
          capacity_mode: string;
          capacity_source_id: string;
          circuit_state: string;
          currency_code: string;
          endpoint_base_url: string;
          endpoint_id: string;
          endpoint_key: string;
          health_state: string;
          input_price_nanos: number;
          integration_style: string;
          max_context_tokens: number;
          model_deprecation_at: string;
          model_display_name: string;
          model_id: string;
          model_release_date: string;
          output_price_nanos: number;
          price_version: number;
          provider_display_name: string;
          provider_id: string;
          provider_key: string;
          provider_model_id: string;
          region_code: string;
          residency_country_code: string;
          retention_class: string;
          secret_reference: string;
          supports_audio: boolean;
          supports_cancellation: boolean;
          supports_streaming: boolean;
          supports_structured_output: boolean;
          supports_tools: boolean;
          supports_vision: boolean;
          unit_quantity: number;
        }[];
      };
      io_get_workspace_provider_policy: {
        Args: { _workspace_id: string };
        Returns: Json;
      };
      io_record_endpoint_outcome: {
        Args: {
          _endpoint_id: string;
          _error_code?: string;
          _latency_ms: number;
          _success: boolean;
        };
        Returns: Json;
      };
      is_chapter_lead: {
        Args: { _chapter_id: string; _user_id: string };
        Returns: boolean;
      };
      is_mission_lead: {
        Args: { _mission_id: string; _user_id: string };
        Returns: boolean;
      };
      is_suspended: { Args: { _user_id: string }; Returns: boolean };
      lead_approve_event: { Args: { _event_id: string }; Returns: undefined };
      lead_approve_story: { Args: { _story_id: string }; Returns: undefined };
      lead_feature_story: { Args: { _story_id: string }; Returns: undefined };
      lead_reject_event: {
        Args: { _event_id: string; _reason?: string };
        Returns: undefined;
      };
      lead_reject_story: {
        Args: { _reason?: string; _story_id: string };
        Returns: undefined;
      };
      lead_remove_chapter_member: {
        Args: { _chapter_id: string; _target_user_id: string };
        Returns: undefined;
      };
      lead_remove_mission_member: {
        Args: { _mission_id: string; _target_user_id: string };
        Returns: undefined;
      };
      leave_my_conversation_space: {
        Args: { _expected_version: number; _space_id: string };
        Returns: undefined;
      };
      list_my_conversation_room_feed: {
        Args: {
          _before_created_at?: string;
          _before_id?: string;
          _limit?: number;
          _room_id: string;
          _thread_id?: string;
        };
        Returns: Json;
      };
      list_my_direct_conversation: {
        Args: {
          _before_created_at?: string;
          _before_id?: string;
          _limit?: number;
          _other_user_id: string;
        };
        Returns: {
          client_request_id: string;
          content: string;
          created_at: string;
          message_id: string;
          read_at: string;
          recipient_id: string;
          sender_id: string;
        }[];
      };
      list_my_io_api_keys: {
        Args: { _workspace_id: string };
        Returns: {
          created_at: string;
          expires_at: string;
          id: string;
          key_prefix: string;
          last_four: string;
          last_used_at: string;
          limit_policy_version: number;
          name: string;
          requests_per_day: number;
          requests_per_minute: number;
          requests_per_month: number;
          scopes: string[];
          spend_currency_code: string;
          spend_per_day_nanos: number;
          spend_per_month_nanos: number;
          status: string;
        }[];
      };
      list_my_io_credit_entries: {
        Args: { _limit?: number; _workspace_id: string };
        Returns: Json;
      };
      list_my_io_invoices: {
        Args: { _limit?: number; _workspace_id: string };
        Returns: Json;
      };
      list_my_io_terminal_events: {
        Args: {
          _before_sequence?: number;
          _limit?: number;
          _session_id: string;
        };
        Returns: {
          content_classification: string;
          event_id: number;
          event_type: string;
          occurred_at: string;
          sequence: number;
          sync_policy: string;
        }[];
      };
      list_my_io_terminal_sessions: {
        Args: { _workspace_id: string };
        Returns: {
          completed_at: string;
          last_event_sequence: number;
          mode: string;
          runtime_version: string;
          session_id: string;
          started_at: string;
          state: string;
          title: string;
        }[];
      };
      list_my_io_usage_history: {
        Args: {
          _before_created_at?: string;
          _before_id?: string;
          _from?: string;
          _limit?: number;
          _model_key?: string;
          _provider_key?: string;
          _result_state?: string;
          _to?: string;
          _workspace_id: string;
        };
        Returns: Json;
      };
      list_my_moderation_notices: { Args: { _limit?: number }; Returns: Json };
      lookup_vouch_code: {
        Args: { _code: string };
        Returns: {
          expires_at: string;
          id: string;
          issuer_id: string;
          status: string;
        }[];
      };
      mark_my_conversation_room_read: {
        Args: { _message_id: string; _room_id: string };
        Returns: {
          last_read_at: string;
          last_read_message_id: string | null;
          room_id: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "conversation_read_states";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      mark_my_direct_conversation_read: {
        Args: { _other_user_id: string };
        Returns: number;
      };
      moderate_conversation_message: {
        Args: {
          _action: string;
          _client_request_id: string;
          _message_id: string;
          _reason: string;
        };
        Returns: Json;
      };
      my_lead_summary: { Args: never; Returns: Json };
      post_my_mission_update: {
        Args: {
          _client_request_id: string;
          _content: string;
          _mission_id: string;
        };
        Returns: {
          author_id: string;
          client_request_id: string | null;
          content: string;
          created_at: string;
          id: string;
          is_pinned: boolean | null;
          mission_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "mission_updates";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      prepare_my_conversation_attachment: {
        Args: {
          _alt_text: string;
          _byte_size: number;
          _client_request_id: string;
          _content_type: string;
          _file_name: string;
          _message_id: string;
        };
        Returns: {
          alt_text: string | null;
          byte_size: number;
          content_sha256: string | null;
          content_type: string;
          created_at: string;
          file_name: string;
          id: string;
          message_id: string;
          review_note: string | null;
          review_version: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          scan_finished_at: string | null;
          scan_provider: string | null;
          scan_started_at: string | null;
          scan_status: string;
          scanner_reference: string | null;
          storage_bucket: string;
          storage_path: string;
          threat_code: string | null;
          uploaded_by: string;
        };
        SetofOptions: {
          from: "*";
          to: "conversation_attachments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      record_conversation_attachment_scan: {
        Args: {
          _attachment_id: string;
          _content_sha256: string;
          _observed_at: string;
          _provider_event_id: string;
          _provider_key: string;
          _threat_code: string;
          _verdict: string;
        };
        Returns: Json;
      };
      record_io_checkout_verification: {
        Args: {
          _checkout_payment_id: string;
          _external_order_id: string;
          _payment_intent_id: string;
          _signature_sha256: string;
        };
        Returns: Json;
      };
      record_io_payment_order: {
        Args: {
          _external_order_id: string;
          _payment_intent_id: string;
          _provider_receipt: string;
        };
        Returns: Json;
      };
      record_io_payment_provider_event: {
        Args: {
          _amount_minor: number;
          _currency_code: string;
          _environment: string;
          _event_type: string;
          _external_order_id: string;
          _external_payment_id: string;
          _external_refund_id: string;
          _occurred_at: string;
          _payload_sha256: string;
          _provider_event_id: string;
          _provider_key: string;
        };
        Returns: Json;
      };
      record_io_refund_submission: {
        Args: { _external_refund_id: string; _refund_id: string };
        Returns: Json;
      };
      record_my_product_event: {
        Args: {
          _client_operation_id: string;
          _event_name: string;
          _surface: string;
        };
        Returns: boolean;
      };
      redeem_vouch_code: { Args: { _code: string }; Returns: Json };
      reject_chapter_proposal: {
        Args: { _proposal_id: string };
        Returns: undefined;
      };
      report_my_conversation_message: {
        Args: {
          _category: string;
          _client_request_id: string;
          _description: string;
          _message_id: string;
        };
        Returns: {
          category: string;
          client_request_id: string | null;
          created_at: string;
          description: string;
          id: string;
          message_id: string | null;
          reporter_id: string;
          room_id: string | null;
          space_id: string;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "conversation_reports";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      request_my_io_terminal_approval: {
        Args: {
          _decision_scope: string;
          _expires_at: string;
          _permission_kind: string;
          _reason: string;
          _risk_class: string;
          _session_id: string;
        };
        Returns: Json;
      };
      request_my_mentor_session: {
        Args: {
          _client_request_id: string;
          _duration_mins: number;
          _expert_id: string;
          _message: string;
        };
        Returns: {
          booker_id: string;
          client_request_id: string | null;
          created_at: string;
          duration_mins: number;
          expert_id: string;
          id: string;
          meeting_url: string | null;
          message: string;
          scheduled_for: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "mentor_sessions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      request_my_space_membership: {
        Args: {
          _client_request_id: string;
          _message: string;
          _requested_role: string;
          _space_id: string;
        };
        Returns: Json;
      };
      request_my_vouch: {
        Args: {
          _client_request_id: string;
          _message: string;
          _target_verifier_id: string;
        };
        Returns: {
          client_request_id: string | null;
          created_at: string;
          id: string;
          message: string;
          requester_id: string;
          responded_at: string | null;
          status: string;
          target_verifier_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "vouch_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      respond_to_my_connection_request: {
        Args: { _request_id: string; _status: string };
        Returns: {
          client_request_id: string | null;
          created_at: string;
          id: string;
          note: string;
          reason: string;
          recipient_id: string;
          responded_at: string | null;
          sender_id: string;
          status: string;
        };
        SetofOptions: {
          from: "*";
          to: "connection_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      revoke_my_io_api_key: { Args: { _key_id: string }; Returns: Json };
      send_my_conversation_message: {
        Args: {
          _client_request_id: string;
          _content: string;
          _room_id: string;
          _thread_id: string;
        };
        Returns: {
          author_id: string;
          client_request_id: string | null;
          content: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          message_type: string;
          provenance: Json;
          reply_to_message_id: string | null;
          room_id: string;
          thread_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "conversation_messages";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      send_my_direct_message: {
        Args: {
          _client_request_id: string;
          _content: string;
          _recipient_id: string;
        };
        Returns: {
          client_request_id: string | null;
          content: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string;
          sender_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "direct_messages";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      send_notification: {
        Args: {
          _link?: string;
          _message: string;
          _type: string;
          _user_id: string;
        };
        Returns: string;
      };
      set_managed_conversation_room_permission: {
        Args: {
          _capability: string;
          _effect: string;
          _role_id: string;
          _room_id: string;
          _user_id: string;
        };
        Returns: Json;
      };
      set_managed_conversation_thread_lock: {
        Args: {
          _client_request_id: string;
          _locked: boolean;
          _reason: string;
          _thread_id: string;
        };
        Returns: Json;
      };
      set_managed_space_lead: {
        Args: {
          _enabled: boolean;
          _expected_version: number;
          _reason: string;
          _space_id: string;
          _target_user_id: string;
        };
        Returns: Json;
      };
      set_my_community_location: {
        Args: {
          _city_label: string;
          _client_operation_id: string;
          _consent_version: string;
          _country_code: string;
          _region_label: string;
          _share_audience: string;
          _share_precision: string;
          _timezone_name: string;
          _use_for_recommendations: boolean;
          _use_for_scheduling: boolean;
        };
        Returns: Json;
      };
      set_my_io_workspace_provider_policy: {
        Args: {
          _allow_china_hosted: boolean;
          _allow_training_possible: boolean;
          _workspace_id: string;
        };
        Returns: Json;
      };
      set_my_measurement_consent: {
        Args: { _client_operation_id: string; _enabled: boolean };
        Returns: boolean;
      };
      start_my_community_onboarding: {
        Args: { _client_operation_id: string; _version: number };
        Returns: {
          community_access: boolean;
          community_current_step: string;
          community_status: string;
          community_version: number;
          io_access: boolean;
          measurement_consent: boolean;
        }[];
      };
      submit_my_moderation_appeal: {
        Args: {
          _client_request_id: string;
          _notice_id: string;
          _reason: string;
        };
        Returns: Json;
      };
      toggle_my_conversation_reaction: {
        Args: { _message_id: string; _reaction_key: string };
        Returns: Json;
      };
      transition_managed_chapter: {
        Args: {
          _chapter_id: string;
          _expected_version: number;
          _reason: string;
          _target_state: string;
        };
        Returns: {
          activated_at: string | null;
          archived_at: string | null;
          city: string | null;
          client_request_id: string | null;
          country: string | null;
          country_code: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          join_policy: string;
          lifecycle_state: string;
          name: string;
          paused_at: string | null;
          place_id: string | null;
          region_id: string | null;
          source_proposal_id: string | null;
          state_version: number;
          updated_at: string;
          visibility: string;
        };
        SetofOptions: {
          from: "*";
          to: "chapters";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      transition_my_mentor_session: {
        Args: {
          _meeting_url?: string;
          _scheduled_for?: string;
          _session_id: string;
          _status: string;
        };
        Returns: {
          booker_id: string;
          client_request_id: string | null;
          created_at: string;
          duration_mins: number;
          expert_id: string;
          id: string;
          meeting_url: string | null;
          message: string;
          scheduled_for: string | null;
          status: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "mentor_sessions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      transition_my_mission: {
        Args: {
          _expected_version: number;
          _mission_id: string;
          _reason: string;
          _target_state: string;
        };
        Returns: {
          activated_at: string | null;
          archived_at: string | null;
          chapter_id: string | null;
          client_request_id: string | null;
          completed_at: string | null;
          country_code: string | null;
          created_at: string;
          created_by: string;
          decision_reason: string | null;
          description: string;
          id: string;
          join_policy: string;
          lifecycle_state: string;
          max_members: number | null;
          place_id: string | null;
          region_id: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          risk_classification: string;
          state_version: number;
          status: string;
          submitted_at: string | null;
          template_key: string | null;
          template_version: number | null;
          theme: string;
          title: string;
          updated_at: string;
          visibility: string;
        };
        SetofOptions: {
          from: "*";
          to: "missions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      unblock_my_member: {
        Args: { _blocked_user_id: string };
        Returns: boolean;
      };
      update_managed_conversation_room: {
        Args: {
          _description: string;
          _display_name: string;
          _posting_policy: string;
          _room_id: string;
        };
        Returns: {
          archived_at: string | null;
          context_group_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          display_name: string;
          id: string;
          position: number;
          posting_policy: string;
          room_type: string;
          space_id: string;
          system_key: string;
          updated_at: string;
          visibility: string;
        };
        SetofOptions: {
          from: "*";
          to: "conversation_rooms";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_my_chapter_details: {
        Args: {
          _chapter_id: string;
          _city: string;
          _country: string;
          _country_code: string;
          _description: string;
          _expected_version: number;
          _join_policy: string;
          _visibility: string;
        };
        Returns: {
          activated_at: string | null;
          archived_at: string | null;
          city: string | null;
          client_request_id: string | null;
          country: string | null;
          country_code: string | null;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          join_policy: string;
          lifecycle_state: string;
          name: string;
          paused_at: string | null;
          place_id: string | null;
          region_id: string | null;
          source_proposal_id: string | null;
          state_version: number;
          updated_at: string;
          visibility: string;
        };
        SetofOptions: {
          from: "*";
          to: "chapters";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      upsert_my_io_billing_profile: {
        Args: {
          _address_lines: Json;
          _billing_email: string;
          _country_code: string;
          _customer_type: string;
          _expected_version?: number;
          _gstin: string;
          _legal_name: string;
          _postal_code: string;
          _state_code: string;
          _tax_registration_name: string;
          _workspace_id: string;
        };
        Returns: Json;
      };
      vouch_directly: { Args: { _recipient_id: string }; Returns: Json };
      vouch_effective_quota: { Args: { _user_id: string }; Returns: number };
      vouch_remaining: { Args: { _user_id: string }; Returns: number };
      vouch_used_in_window: { Args: { _user_id: string }; Returns: number };
      withdraw_my_location_consent: {
        Args: { _client_operation_id: string; _consent_version: string };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "admin" | "member" | "chapter_lead" | "editor";
      orbit_segment:
        | "youth"
        | "founder"
        | "expert"
        | "investor"
        | "diaspora"
        | "partner"
        | "researcher";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

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
} as const;
