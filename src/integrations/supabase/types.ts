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
          created_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          chapter_id: string;
          created_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          created_at?: string;
          role?: string;
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
          city: string | null;
          country: string | null;
          created_at: string | null;
          expected_size: number | null;
          id: string;
          proposed_name: string;
          proposer_background: string;
          proposer_id: string;
          rationale: string;
          status: string | null;
          target_audience: string | null;
        };
        Insert: {
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          expected_size?: number | null;
          id?: string;
          proposed_name: string;
          proposer_background: string;
          proposer_id: string;
          rationale: string;
          status?: string | null;
          target_audience?: string | null;
        };
        Update: {
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          expected_size?: number | null;
          id?: string;
          proposed_name?: string;
          proposer_background?: string;
          proposer_id?: string;
          rationale?: string;
          status?: string | null;
          target_audience?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chapter_proposals_proposer_id_fkey";
            columns: ["proposer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      chapters: {
        Row: {
          city: string | null;
          country: string | null;
          created_at: string;
          description: string;
          id: string;
          name: string;
        };
        Insert: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          name: string;
        };
        Update: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      connection_requests: {
        Row: {
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
          content: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_id: string;
          sender_id: string;
        };
        Update: {
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
          name: string;
          project_id: string | null;
          revoked_at: string | null;
          scopes: string[];
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
          name: string;
          project_id?: string | null;
          revoked_at?: string | null;
          scopes?: string[];
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
          name?: string;
          project_id?: string | null;
          revoked_at?: string | null;
          scopes?: string[];
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
      io_endpoint_capability_versions: {
        Row: {
          endpoint_id: string
          evidence_url: string | null
          id: string
          recorded_at: string
          supports_audio: boolean
          supports_batch: boolean
          supports_cancellation: boolean
          supports_chat: boolean
          supports_embeddings: boolean
          supports_model_listing: boolean
          supports_streaming: boolean
          supports_structured_output: boolean
          supports_tools: boolean
          supports_usage_receipt: boolean
          supports_vision: boolean
          tested_at: string | null
          verification_state: string
          verified_by: string | null
          version: number
        }
        Insert: {
          endpoint_id: string
          evidence_url?: string | null
          id?: string
          recorded_at?: string
          supports_audio?: boolean
          supports_batch?: boolean
          supports_cancellation?: boolean
          supports_chat?: boolean
          supports_embeddings?: boolean
          supports_model_listing?: boolean
          supports_streaming?: boolean
          supports_structured_output?: boolean
          supports_tools?: boolean
          supports_usage_receipt?: boolean
          supports_vision?: boolean
          tested_at?: string | null
          verification_state?: string
          verified_by?: string | null
          version: number
        }
        Update: {
          endpoint_id?: string
          evidence_url?: string | null
          id?: string
          recorded_at?: string
          supports_audio?: boolean
          supports_batch?: boolean
          supports_cancellation?: boolean
          supports_chat?: boolean
          supports_embeddings?: boolean
          supports_model_listing?: boolean
          supports_streaming?: boolean
          supports_structured_output?: boolean
          supports_tools?: boolean
          supports_usage_receipt?: boolean
          supports_vision?: boolean
          tested_at?: string | null
          verification_state?: string
          verified_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "io_endpoint_capability_versions_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "io_model_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      io_endpoint_pricing_versions: {
        Row: {
          billing_meter: string
          cached_input_price_nanos: number | null
          currency_code: string
          effective_from: string
          effective_until: string | null
          endpoint_id: string
          evidence_note: string | null
          evidence_url: string | null
          id: string
          input_price_nanos: number | null
          member_visible: boolean
          output_price_nanos: number | null
          publication_state: string
          recorded_at: string
          recorded_by: string | null
          unit_price_nanos: number | null
          unit_quantity: number
          version: number
        }
        Insert: {
          billing_meter: string
          cached_input_price_nanos?: number | null
          currency_code: string
          effective_from: string
          effective_until?: string | null
          endpoint_id: string
          evidence_note?: string | null
          evidence_url?: string | null
          id?: string
          input_price_nanos?: number | null
          member_visible?: boolean
          output_price_nanos?: number | null
          publication_state?: string
          recorded_at?: string
          recorded_by?: string | null
          unit_price_nanos?: number | null
          unit_quantity: number
          version: number
        }
        Update: {
          billing_meter?: string
          cached_input_price_nanos?: number | null
          currency_code?: string
          effective_from?: string
          effective_until?: string | null
          endpoint_id?: string
          evidence_note?: string | null
          evidence_url?: string | null
          id?: string
          input_price_nanos?: number | null
          member_visible?: boolean
          output_price_nanos?: number | null
          publication_state?: string
          recorded_at?: string
          recorded_by?: string | null
          unit_price_nanos?: number | null
          unit_quantity?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "io_endpoint_pricing_versions_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "io_model_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      io_model_endpoints: {
        Row: {
          capacity_mode: string
          capacity_source_id: string | null
          created_at: string
          created_by: string
          endpoint_key: string
          id: string
          max_concurrency: number | null
          member_visible: boolean
          model_id: string
          provider_id: string
          region_code: string | null
          residency_country_code: string | null
          residency_evidence_url: string | null
          retention_class: string
          routing_state: string
          updated_at: string
        }
        Insert: {
          capacity_mode: string
          capacity_source_id?: string | null
          created_at?: string
          created_by?: string
          endpoint_key: string
          id?: string
          max_concurrency?: number | null
          member_visible?: boolean
          model_id: string
          provider_id: string
          region_code?: string | null
          residency_country_code?: string | null
          residency_evidence_url?: string | null
          retention_class?: string
          routing_state?: string
          updated_at?: string
        }
        Update: {
          capacity_mode?: string
          capacity_source_id?: string | null
          created_at?: string
          created_by?: string
          endpoint_key?: string
          id?: string
          max_concurrency?: number | null
          member_visible?: boolean
          model_id?: string
          provider_id?: string
          region_code?: string | null
          residency_country_code?: string | null
          residency_evidence_url?: string | null
          retention_class?: string
          routing_state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "io_model_endpoints_capacity_source_id_fkey"
            columns: ["capacity_source_id"]
            isOneToOne: false
            referencedRelation: "io_capacity_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "io_model_endpoints_model_provider_fkey"
            columns: ["model_id", "provider_id"]
            isOneToOne: false
            referencedRelation: "io_models"
            referencedColumns: ["id", "provider_id"]
          },
        ]
      }
      io_models: {
        Row: {
          commercial_hosting_rights: string
          commercial_redistribution_rights: string
          created_at: string
          created_by: string
          deprecation_at: string | null
          display_name: string
          id: string
          licence_evidence_url: string | null
          licence_name: string | null
          listing_state: string
          max_context_tokens: number | null
          modalities: string[]
          model_creator: string | null
          model_family: string | null
          origin_country_code: string | null
          provider_id: string
          provider_model_id: string
          revision: string | null
          updated_at: string
        }
        Insert: {
          commercial_hosting_rights?: string
          commercial_redistribution_rights?: string
          created_at?: string
          created_by?: string
          deprecation_at?: string | null
          display_name: string
          id?: string
          licence_evidence_url?: string | null
          licence_name?: string | null
          listing_state?: string
          max_context_tokens?: number | null
          modalities?: string[]
          model_creator?: string | null
          model_family?: string | null
          origin_country_code?: string | null
          provider_id: string
          provider_model_id: string
          revision?: string | null
          updated_at?: string
        }
        Update: {
          commercial_hosting_rights?: string
          commercial_redistribution_rights?: string
          created_at?: string
          created_by?: string
          deprecation_at?: string | null
          display_name?: string
          id?: string
          licence_evidence_url?: string | null
          licence_name?: string | null
          listing_state?: string
          max_context_tokens?: number | null
          modalities?: string[]
          model_creator?: string | null
          model_family?: string | null
          origin_country_code?: string | null
          provider_id?: string
          provider_model_id?: string
          revision?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "io_models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "io_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      io_providers: {
        Row: {
          catalogue_visibility: string
          created_at: string
          created_by: string
          data_retention_class: string
          default_region_code: string | null
          default_residency_country: string | null
          display_name: string
          id: string
          integration_style: string
          lifecycle_state: string
          operator_name: string | null
          provider_key: string
          provider_kind: string
          public_summary: string | null
          terms_evidence_url: string | null
          terms_version: string | null
          training_use_class: string
          updated_at: string
        }
        Insert: {
          catalogue_visibility?: string
          created_at?: string
          created_by?: string
          data_retention_class?: string
          default_region_code?: string | null
          default_residency_country?: string | null
          display_name: string
          id?: string
          integration_style: string
          lifecycle_state?: string
          operator_name?: string | null
          provider_key: string
          provider_kind: string
          public_summary?: string | null
          terms_evidence_url?: string | null
          terms_version?: string | null
          training_use_class?: string
          updated_at?: string
        }
        Update: {
          catalogue_visibility?: string
          created_at?: string
          created_by?: string
          data_retention_class?: string
          default_region_code?: string | null
          default_residency_country?: string | null
          display_name?: string
          id?: string
          integration_style?: string
          lifecycle_state?: string
          operator_name?: string | null
          provider_key?: string
          provider_kind?: string
          public_summary?: string | null
          terms_evidence_url?: string | null
          terms_version?: string | null
          training_use_class?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          commitment_type: string | null;
          created_at: string;
          message: string | null;
          mission_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          commitment_type?: string | null;
          created_at?: string;
          message?: string | null;
          mission_id: string;
          role: string;
          user_id: string;
        };
        Update: {
          commitment_type?: string | null;
          created_at?: string;
          message?: string | null;
          mission_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
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
          content: string;
          created_at: string;
          id: string;
          is_pinned: boolean | null;
          mission_id: string;
        };
        Insert: {
          author_id: string;
          content: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean | null;
          mission_id: string;
        };
        Update: {
          author_id?: string;
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
          chapter_id: string | null;
          created_at: string;
          created_by: string;
          description: string;
          id: string;
          status: string;
          theme: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          chapter_id?: string | null;
          created_at?: string;
          created_by: string;
          description: string;
          id?: string;
          status?: string;
          theme: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          chapter_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string;
          id?: string;
          status?: string;
          theme?: string;
          title?: string;
          updated_at?: string;
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
            foreignKeyName: "missions_created_by_fkey";
            columns: ["created_by"];
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
          created_at: string;
          id: string;
          message: string;
          requester_id: string;
          responded_at: string | null;
          status: string;
          target_verifier_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          requester_id: string;
          responded_at?: string | null;
          status?: string;
          target_verifier_id?: string | null;
        };
        Update: {
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
          name: string | null;
          project_id: string | null;
          revoked_at: string | null;
          scopes: string[] | null;
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
          name?: string | null;
          project_id?: string | null;
          revoked_at?: string | null;
          scopes?: string[] | null;
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
          name?: string | null;
          project_id?: string | null;
          revoked_at?: string | null;
          scopes?: string[] | null;
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
      admin_resolve_vouch_request: {
        Args: { _approve: boolean; _reason?: string; _request_id: string };
        Returns: undefined;
      };
      can_author_education: { Args: { _user_id: string }; Returns: boolean };
      create_my_io_workspace: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["io_workspaces"]["Row"];
      };
      event_rsvp_counts: { Args: { _event_id: string }; Returns: Json };
      get_connection_email: {
        Args: { target_user_id: string };
        Returns: string;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
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
      lookup_vouch_code: {
        Args: { _code: string };
        Returns: {
          expires_at: string;
          id: string;
          issuer_id: string;
          status: string;
        }[];
      };
      my_lead_summary: { Args: never; Returns: Json };
      redeem_vouch_code: { Args: { _code: string }; Returns: Json };
      send_notification: {
        Args: {
          _link?: string;
          _message: string;
          _type: string;
          _user_id: string;
        };
        Returns: string;
      };
      vouch_directly: { Args: { _recipient_id: string }; Returns: Json };
      vouch_effective_quota: { Args: { _user_id: string }; Returns: number };
      vouch_remaining: { Args: { _user_id: string }; Returns: number };
      vouch_used_in_window: { Args: { _user_id: string }; Returns: number };
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
