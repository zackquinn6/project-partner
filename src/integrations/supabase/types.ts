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
      admin_sensitive_data_access: {
        Row: {
          access_type: string
          accessed_table: string
          accessed_user_id: string | null
          admin_user_id: string
          created_at: string
          data_fields_accessed: string[] | null
          id: string
          ip_address: unknown
          justification: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_table: string
          accessed_user_id?: string | null
          admin_user_id: string
          created_at?: string
          data_fields_accessed?: string[] | null
          id?: string
          ip_address?: unknown
          justification?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_table?: string
          accessed_user_id?: string | null
          admin_user_id?: string
          created_at?: string
          data_fields_accessed?: string[] | null
          id?: string
          ip_address?: unknown
          justification?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          sensitive_data_accessed: boolean | null
          session_end: string | null
          session_start: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          sensitive_data_accessed?: boolean | null
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          sensitive_data_accessed?: boolean | null
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      after_action_reviews: {
        Row: {
          changes: string
          created_at: string
          experience: string
          id: string
          intent: string
          project_run_id: string
          reasons: string
          updated_at: string
        }
        Insert: {
          changes?: string
          created_at?: string
          experience?: string
          id?: string
          intent?: string
          project_run_id: string
          reasons?: string
          updated_at?: string
        }
        Update: {
          changes?: string
          created_at?: string
          experience?: string
          id?: string
          intent?: string
          project_run_id?: string
          reasons?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "after_action_reviews_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          type: string
          updated_by: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          type: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          type?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_repair_analyses: {
        Row: {
          action_plan: string | null
          analysis_result: Json | null
          created_at: string
          difficulty_level: string | null
          estimated_cost_range: string | null
          estimated_time: string | null
          id: string
          issue_category: string | null
          photos: Json
          recommended_materials: Json | null
          recommended_tools: Json | null
          root_cause_analysis: string | null
          severity_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_plan?: string | null
          analysis_result?: Json | null
          created_at?: string
          difficulty_level?: string | null
          estimated_cost_range?: string | null
          estimated_time?: string | null
          id?: string
          issue_category?: string | null
          photos?: Json
          recommended_materials?: Json | null
          recommended_tools?: Json | null
          root_cause_analysis?: string | null
          severity_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_plan?: string | null
          analysis_result?: Json | null
          created_at?: string
          difficulty_level?: string | null
          estimated_cost_range?: string | null
          estimated_time?: string | null
          id?: string
          issue_category?: string | null
          photos?: Json
          recommended_materials?: Json | null
          recommended_tools?: Json | null
          root_cause_analysis?: string | null
          severity_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_overrides: {
        Row: {
          app_id: string
          app_name: string
          created_at: string
          description: string | null
          display_order: number
          icon: string
          updated_at: string
        }
        Insert: {
          app_id: string
          app_name: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          updated_at?: string
        }
        Update: {
          app_id?: string
          app_name?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      communication_outbound_log: {
        Row: {
          body_text: string
          channel: string
          created_by_user_id: string
          id: string
          plan_id: string
          project_run_id: string
          recipient_email: string | null
          sent_at: string
          stakeholder_id: string | null
          subject: string
          template_key: string
        }
        Insert: {
          body_text: string
          channel: string
          created_by_user_id: string
          id?: string
          plan_id: string
          project_run_id: string
          recipient_email?: string | null
          sent_at?: string
          stakeholder_id?: string | null
          subject: string
          template_key: string
        }
        Update: {
          body_text?: string
          channel?: string
          created_by_user_id?: string
          id?: string
          plan_id?: string
          project_run_id?: string
          recipient_email?: string | null
          sent_at?: string
          stakeholder_id?: string | null
          subject?: string
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_outbound_log_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "project_communication_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_outbound_log_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_outbound_log_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "communication_stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_schedule_items: {
        Row: {
          cadence: string
          created_at: string
          id: string
          last_sent_at: string | null
          next_due_at: string | null
          plan_id: string
          stakeholder_id: string | null
          template_key: string
        }
        Insert: {
          cadence: string
          created_at?: string
          id?: string
          last_sent_at?: string | null
          next_due_at?: string | null
          plan_id: string
          stakeholder_id?: string | null
          template_key: string
        }
        Update: {
          cadence?: string
          created_at?: string
          id?: string
          last_sent_at?: string | null
          next_due_at?: string | null
          plan_id?: string
          stakeholder_id?: string | null
          template_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_schedule_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "project_communication_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_schedule_items_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "communication_stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_stakeholders: {
        Row: {
          concerns: string[]
          created_at: string
          delivery_method: string
          display_name: string
          email: string | null
          id: string
          plan_id: string
          preferred_frequency: string
          role_label: string
          sort_order: number
        }
        Insert: {
          concerns?: string[]
          created_at?: string
          delivery_method: string
          display_name: string
          email?: string | null
          id?: string
          plan_id: string
          preferred_frequency: string
          role_label: string
          sort_order?: number
        }
        Update: {
          concerns?: string[]
          created_at?: string
          delivery_method?: string
          display_name?: string
          email?: string | null
          id?: string
          plan_id?: string
          preferred_frequency?: string
          role_label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "communication_stakeholders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "project_communication_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_trigger_rules: {
        Row: {
          enabled: boolean
          id: string
          plan_id: string
          trigger_type: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          plan_id: string
          trigger_type: string
        }
        Update: {
          enabled?: boolean
          id?: string
          plan_id?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_trigger_rules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "project_communication_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_phase_assignments: {
        Row: {
          assigned_at: string | null
          contractor_id: string
          created_at: string
          id: string
          notes: string | null
          phase_id: string | null
          phase_name: string
          project_run_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          contractor_id: string
          created_at?: string
          id?: string
          notes?: string | null
          phase_id?: string | null
          phase_name: string
          project_run_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          contractor_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          phase_id?: string | null
          phase_name?: string
          project_run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_phase_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "user_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_phase_assignments_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      core_item_attribute_definitions: {
        Row: {
          attribute_definitions: Json
          core_item_id: string
          created_at: string
          item_type: string
          updated_at: string
        }
        Insert: {
          attribute_definitions: Json
          core_item_id: string
          created_at?: string
          item_type: string
          updated_at?: string
        }
        Update: {
          attribute_definitions?: Json
          core_item_id?: string
          created_at?: string
          item_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          days_to_add: number
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_redemptions: number | null
          times_redeemed: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          days_to_add: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          times_redeemed?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          days_to_add?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          times_redeemed?: number | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          days_added: number
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          days_added: number
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          days_added?: number
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_tree_conditions: {
        Row: {
          condition_data: Json | null
          condition_type: string
          created_at: string
          id: string
          is_fallback: boolean | null
          next_operation_id: string | null
          operation_id: string
          priority: number | null
          updated_at: string
        }
        Insert: {
          condition_data?: Json | null
          condition_type: string
          created_at?: string
          id?: string
          is_fallback?: boolean | null
          next_operation_id?: string | null
          operation_id: string
          priority?: number | null
          updated_at?: string
        }
        Update: {
          condition_data?: Json | null
          condition_type?: string
          created_at?: string
          id?: string
          is_fallback?: boolean | null
          next_operation_id?: string | null
          operation_id?: string
          priority?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_tree_conditions_next_operation_id_fkey"
            columns: ["next_operation_id"]
            isOneToOne: false
            referencedRelation: "decision_tree_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_tree_conditions_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "decision_tree_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_tree_execution_paths: {
        Row: {
          chosen_path: string | null
          created_at: string
          decision_data: Json | null
          decision_tree_id: string
          execution_status: string | null
          execution_timestamp: string | null
          id: string
          operation_id: string
          operation_name: string
          phase_name: string
          project_run_id: string
          user_id: string
        }
        Insert: {
          chosen_path?: string | null
          created_at?: string
          decision_data?: Json | null
          decision_tree_id: string
          execution_status?: string | null
          execution_timestamp?: string | null
          id?: string
          operation_id: string
          operation_name: string
          phase_name: string
          project_run_id: string
          user_id: string
        }
        Update: {
          chosen_path?: string | null
          created_at?: string
          decision_data?: Json | null
          decision_tree_id?: string
          execution_status?: string | null
          execution_timestamp?: string | null
          id?: string
          operation_id?: string
          operation_name?: string
          phase_name?: string
          project_run_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_tree_execution_paths_decision_tree_id_fkey"
            columns: ["decision_tree_id"]
            isOneToOne: false
            referencedRelation: "decision_trees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_tree_execution_paths_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "decision_tree_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_tree_operations: {
        Row: {
          condition_rules: Json | null
          created_at: string
          decision_tree_id: string
          dependencies: string[] | null
          display_order: number | null
          fallback_operation_id: string | null
          id: string
          is_optional: boolean | null
          notes: string | null
          operation_name: string
          operation_type: string
          parallel_group: string | null
          phase_name: string
          updated_at: string
        }
        Insert: {
          condition_rules?: Json | null
          created_at?: string
          decision_tree_id: string
          dependencies?: string[] | null
          display_order?: number | null
          fallback_operation_id?: string | null
          id?: string
          is_optional?: boolean | null
          notes?: string | null
          operation_name: string
          operation_type: string
          parallel_group?: string | null
          phase_name: string
          updated_at?: string
        }
        Update: {
          condition_rules?: Json | null
          created_at?: string
          decision_tree_id?: string
          dependencies?: string[] | null
          display_order?: number | null
          fallback_operation_id?: string | null
          id?: string
          is_optional?: boolean | null
          notes?: string | null
          operation_name?: string
          operation_type?: string
          parallel_group?: string | null
          phase_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_tree_operations_decision_tree_id_fkey"
            columns: ["decision_tree_id"]
            isOneToOne: false
            referencedRelation: "decision_trees"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_trees: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempted_at: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string
        }
        Insert: {
          attempted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email: string
        }
        Update: {
          attempted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          admin_notes: string | null
          admin_response: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          priority_request: string | null
          roadmap_item_id: string | null
          status: string | null
          submitted_by: string | null
          title: string
          updated_at: string
          votes: number | null
        }
        Insert: {
          admin_notes?: string | null
          admin_response?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          priority_request?: string | null
          roadmap_item_id?: string | null
          status?: string | null
          submitted_by?: string | null
          title: string
          updated_at?: string
          votes?: number | null
        }
        Update: {
          admin_notes?: string | null
          admin_response?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          priority_request?: string | null
          roadmap_item_id?: string | null
          status?: string | null
          submitted_by?: string | null
          title?: string
          updated_at?: string
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_roadmap_item_id_fkey"
            columns: ["roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "feature_roadmap"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_roadmap: {
        Row: {
          category: string | null
          completion_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          priority: string | null
          status: string | null
          target_date: string | null
          title: string
          updated_at: string
          votes: number | null
        }
        Insert: {
          category?: string | null
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          priority?: string | null
          status?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
          votes?: number | null
        }
        Update: {
          category?: string | null
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          priority?: string | null
          status?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
          votes?: number | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          actioned_at: string | null
          actioned_by: string | null
          admin_notes: string | null
          category: string
          created_at: string
          id: string
          message: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actioned_at?: string | null
          actioned_by?: string | null
          admin_notes?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actioned_at?: string | null
          actioned_by?: string | null
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      help_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          model: string | null
          photo_paths: string[]
          role: string
          safety_flags: Json
          thread_id: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          photo_paths?: string[]
          role: string
          safety_flags?: Json
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          photo_paths?: string[]
          role?: string
          safety_flags?: Json
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "help_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      help_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          phase_id: string | null
          phase_name: string | null
          project_run_id: string | null
          status: string
          step_id: string | null
          step_title: string | null
          template_family: string
          template_project_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          phase_id?: string | null
          phase_name?: string | null
          project_run_id?: string | null
          status?: string
          step_id?: string | null
          step_title?: string | null
          template_family: string
          template_project_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          phase_id?: string | null
          phase_name?: string | null
          project_run_id?: string | null
          status?: string
          step_id?: string | null
          step_title?: string | null
          template_family?: string
          template_project_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_threads_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_threads_template_project_id_fkey"
            columns: ["template_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      help_usage: {
        Row: {
          created_at: string
          id: string
          message_count: number
          period_end: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          period_end: string
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      home_details: {
        Row: {
          address: string | null
          appliances_systems: Json | null
          bathrooms: number | null
          bedrooms: number | null
          build_year: string | null
          city: string | null
          climate_region: string | null
          created_at: string
          exterior_type: string | null
          foundation_type: string | null
          heating_cooling_systems: Json | null
          home_id: string
          home_ownership: string | null
          home_type: string | null
          home_year: number | null
          hot_water_system: string | null
          id: string
          last_synced_at: string | null
          lawn_landscape_choice: string | null
          purchase_date: string | null
          roof_type: string | null
          sprinkler_system: boolean | null
          square_footage: number | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          appliances_systems?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          build_year?: string | null
          city?: string | null
          climate_region?: string | null
          created_at?: string
          exterior_type?: string | null
          foundation_type?: string | null
          heating_cooling_systems?: Json | null
          home_id: string
          home_ownership?: string | null
          home_type?: string | null
          home_year?: number | null
          hot_water_system?: string | null
          id?: string
          last_synced_at?: string | null
          lawn_landscape_choice?: string | null
          purchase_date?: string | null
          roof_type?: string | null
          sprinkler_system?: boolean | null
          square_footage?: number | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          appliances_systems?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          build_year?: string | null
          city?: string | null
          climate_region?: string | null
          created_at?: string
          exterior_type?: string | null
          foundation_type?: string | null
          heating_cooling_systems?: Json | null
          home_id?: string
          home_ownership?: string | null
          home_type?: string | null
          home_year?: number | null
          hot_water_system?: string | null
          id?: string
          last_synced_at?: string | null
          lawn_landscape_choice?: string | null
          purchase_date?: string | null
          roof_type?: string | null
          sprinkler_system?: boolean | null
          square_footage?: number | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_details_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: true
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      home_risk_mitigations: {
        Row: {
          created_at: string
          home_id: string
          id: string
          is_mitigated: boolean
          mitigation_notes: string | null
          risk_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          home_id: string
          id?: string
          is_mitigated?: boolean
          mitigation_notes?: string | null
          risk_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          home_id?: string
          id?: string
          is_mitigated?: boolean
          mitigation_notes?: string | null
          risk_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_risk_mitigations_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_risk_mitigations_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "homes_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      home_risks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_year: number | null
          id: string
          material_name: string
          risk_level: string
          start_year: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_year?: number | null
          id?: string
          material_name: string
          risk_level: string
          start_year: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_year?: number | null
          id?: string
          material_name?: string
          risk_level?: string
          start_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      home_spaces: {
        Row: {
          created_at: string
          floor_plan_image_url: string | null
          home_id: string
          id: string
          notes: string | null
          space_name: string
          space_type: string | null
          square_footage: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          floor_plan_image_url?: string | null
          home_id: string
          id?: string
          notes?: string | null
          space_name: string
          space_type?: string | null
          square_footage?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          floor_plan_image_url?: string | null
          home_id?: string
          id?: string
          notes?: string | null
          space_name?: string
          space_type?: string | null
          square_footage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_spaces_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      home_task_assignments: {
        Row: {
          created_at: string
          id: string
          person_id: string
          scheduled_date: string
          scheduled_hours: number | null
          subtask_id: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          scheduled_date: string
          scheduled_hours?: number | null
          subtask_id?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          scheduled_date?: string
          scheduled_hours?: number | null
          subtask_id?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_task_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "home_task_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_task_assignments_subtask_id_fkey"
            columns: ["subtask_id"]
            isOneToOne: false
            referencedRelation: "home_task_subtasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "home_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      home_task_people: {
        Row: {
          availability_end_date: string | null
          availability_mode: string | null
          availability_start_date: string | null
          available_days: string[] | null
          available_hours: number | null
          consecutive_days: number | null
          created_at: string
          diy_level: string | null
          email: string | null
          home_id: string | null
          hourly_rate: number | null
          id: string
          name: string
          not_available_dates: string[] | null
          phone: string | null
          specific_dates: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_end_date?: string | null
          availability_mode?: string | null
          availability_start_date?: string | null
          available_days?: string[] | null
          available_hours?: number | null
          consecutive_days?: number | null
          created_at?: string
          diy_level?: string | null
          email?: string | null
          home_id?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          not_available_dates?: string[] | null
          phone?: string | null
          specific_dates?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_end_date?: string | null
          availability_mode?: string | null
          availability_start_date?: string | null
          available_days?: string[] | null
          available_hours?: number | null
          consecutive_days?: number | null
          created_at?: string
          diy_level?: string | null
          email?: string | null
          home_id?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          not_available_dates?: string[] | null
          phone?: string | null
          specific_dates?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_task_people_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      home_task_schedules: {
        Row: {
          assignments_count: number | null
          created_at: string
          generated_at: string | null
          home_id: string | null
          id: string
          schedule_data: Json | null
          start_date: string
          unassigned: Json | null
          updated_at: string
          user_id: string
          warnings: Json | null
        }
        Insert: {
          assignments_count?: number | null
          created_at?: string
          generated_at?: string | null
          home_id?: string | null
          id?: string
          schedule_data?: Json | null
          start_date: string
          unassigned?: Json | null
          updated_at?: string
          user_id: string
          warnings?: Json | null
        }
        Update: {
          assignments_count?: number | null
          created_at?: string
          generated_at?: string | null
          home_id?: string | null
          id?: string
          schedule_data?: Json | null
          start_date?: string
          unassigned?: Json | null
          updated_at?: string
          user_id?: string
          warnings?: Json | null
        }
        Relationships: []
      }
      home_task_subtasks: {
        Row: {
          assigned_person_id: string | null
          completed: boolean | null
          created_at: string
          diy_level: string | null
          estimated_hours: number | null
          id: string
          order_index: number | null
          task_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_person_id?: string | null
          completed?: boolean | null
          created_at?: string
          diy_level?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number | null
          task_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_person_id?: string | null
          completed?: boolean | null
          created_at?: string
          diy_level?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number | null
          task_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_task_subtasks_assigned_person_id_fkey"
            columns: ["assigned_person_id"]
            isOneToOne: false
            referencedRelation: "home_task_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_task_subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "home_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      home_tasks: {
        Row: {
          created_at: string
          description: string | null
          diy_level: string | null
          due_date: string | null
          home_id: string | null
          id: string
          notes: string | null
          ordered: boolean | null
          priority: string | null
          project_run_id: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          diy_level?: string | null
          due_date?: string | null
          home_id?: string | null
          id?: string
          notes?: string | null
          ordered?: boolean | null
          priority?: string | null
          project_run_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          diy_level?: string | null
          due_date?: string | null
          home_id?: string | null
          id?: string
          notes?: string | null
          ordered?: boolean | null
          priority?: string | null
          project_run_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_tasks_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_tasks_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      homes: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean | null
          name: string
          notes: string | null
          photos: string[] | null
          updated_at: string
          user_id: string
          ZIP_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          name: string
          notes?: string | null
          photos?: string[] | null
          updated_at?: string
          user_id: string
          ZIP_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          photos?: string[] | null
          updated_at?: string
          user_id?: string
          ZIP_code?: string | null
        }
        Relationships: []
      }
      homes_risks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_year: number | null
          id: string
          material_name: string
          risk_level: string
          start_year: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_year?: number | null
          id?: string
          material_name: string
          risk_level: string
          start_year: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_year?: number | null
          id?: string
          material_name?: string
          risk_level?: string
          start_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_completions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          photo_url: string | null
          scheduled_due_date: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          scheduled_due_date?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          scheduled_due_date?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "user_maintenance_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_notification_settings: {
        Row: {
          created_at: string
          email_address: string | null
          email_enabled: boolean | null
          id: string
          notify_due_date: boolean | null
          notify_monthly: boolean | null
          notify_weekly: boolean | null
          phone_number: string | null
          sms_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean | null
          id?: string
          notify_due_date?: boolean | null
          notify_monthly?: boolean | null
          notify_weekly?: boolean | null
          phone_number?: string | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_address?: string | null
          email_enabled?: boolean | null
          id?: string
          notify_due_date?: boolean | null
          notify_monthly?: boolean | null
          notify_weekly?: boolean | null
          phone_number?: string | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_templates: {
        Row: {
          benefits_of_maintenance: string | null
          category: string | null
          created_at: string
          created_by: string | null
          criticality: number | null
          description: string | null
          frequency_days: number
          id: string
          instructions: string | null
          photo_url: string | null
          repair_cost_savings: string | null
          risks_of_skipping: string | null
          summary: string | null
          title: string
          typical_season: string | null
          updated_at: string
        }
        Insert: {
          benefits_of_maintenance?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          criticality?: number | null
          description?: string | null
          frequency_days: number
          id?: string
          instructions?: string | null
          photo_url?: string | null
          repair_cost_savings?: string | null
          risks_of_skipping?: string | null
          summary?: string | null
          title: string
          typical_season?: string | null
          updated_at?: string
        }
        Update: {
          benefits_of_maintenance?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          criticality?: number | null
          description?: string | null
          frequency_days?: number
          id?: string
          instructions?: string | null
          photo_url?: string | null
          repair_cost_savings?: string | null
          risks_of_skipping?: string | null
          summary?: string | null
          title?: string
          typical_season?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          alternates: string | null
          avg_cost_per_unit: number | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_rental_available: boolean | null
          name: string
          notes: string | null
          photo_url: string | null
          supplier_link: string | null
          unit: string | null
          unit_size: string | null
          updated_at: string
        }
        Insert: {
          alternates?: string | null
          avg_cost_per_unit?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_rental_available?: boolean | null
          name: string
          notes?: string | null
          photo_url?: string | null
          supplier_link?: string | null
          unit?: string | null
          unit_size?: string | null
          updated_at?: string
        }
        Update: {
          alternates?: string | null
          avg_cost_per_unit?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_rental_available?: boolean | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          supplier_link?: string | null
          unit?: string | null
          unit_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      materials_variants: {
        Row: {
          attribute_definitions: Json
          attributes: Json
          created_at: string
          description: string | null
          id: string
          material_id: string
          name: string
          photo_url: string | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          attribute_definitions?: Json
          attributes?: Json
          created_at?: string
          description?: string | null
          id?: string
          material_id: string
          name: string
          photo_url?: string | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          attribute_definitions?: Json
          attributes?: Json
          created_at?: string
          description?: string | null
          id?: string
          material_id?: string
          name?: string
          photo_url?: string | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_variants_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_status: {
        Row: {
          created_at: string
          id: string
          last_trial_notification_date: string | null
          member_status: boolean
          membership_end_date: string | null
          membership_start_date: string | null
          trial_end_date: string | null
          trial_extended_by: number | null
          trial_start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_trial_notification_date?: string | null
          member_status?: boolean
          membership_end_date?: string | null
          membership_start_date?: string | null
          trial_end_date?: string | null
          trial_extended_by?: number | null
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_trial_notification_date?: string | null
          member_status?: boolean
          membership_end_date?: string | null
          membership_start_date?: string | null
          trial_end_date?: string | null
          trial_extended_by?: number | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      operation_steps: {
        Row: {
          allow_content_edit: boolean | null
          apps: Json | null
          created_at: string
          description: string | null
          display_order: number
          flow_type: string | null
          id: string
          materials: Json | null
          number_of_workers: number | null
          operation_id: string
          outputs: Json | null
          process_variables: Json | null
          skill_level: string | null
          step_title: string
          step_type: string | null
          time_estimate_high: number | null
          time_estimate_low: number | null
          time_estimate_med: number | null
          tools: Json | null
          updated_at: string
        }
        Insert: {
          allow_content_edit?: boolean | null
          apps?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          flow_type?: string | null
          id?: string
          materials?: Json | null
          number_of_workers?: number | null
          operation_id: string
          outputs?: Json | null
          process_variables?: Json | null
          skill_level?: string | null
          step_title: string
          step_type?: string | null
          time_estimate_high?: number | null
          time_estimate_low?: number | null
          time_estimate_med?: number | null
          tools?: Json | null
          updated_at?: string
        }
        Update: {
          allow_content_edit?: boolean | null
          apps?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          flow_type?: string | null
          id?: string
          materials?: Json | null
          number_of_workers?: number | null
          operation_id?: string
          outputs?: Json | null
          process_variables?: Json | null
          skill_level?: string | null
          step_title?: string
          step_type?: string | null
          time_estimate_high?: number | null
          time_estimate_low?: number | null
          time_estimate_med?: number | null
          tools?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_steps_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "phase_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      pfmea_action_items: {
        Row: {
          completion_notes: string | null
          created_at: string
          failure_mode_id: string
          id: string
          recommended_action: string
          responsible_person: string | null
          status: string
          target_completion_date: string | null
          updated_at: string
        }
        Insert: {
          completion_notes?: string | null
          created_at?: string
          failure_mode_id: string
          id?: string
          recommended_action?: string
          responsible_person?: string | null
          status?: string
          target_completion_date?: string | null
          updated_at?: string
        }
        Update: {
          completion_notes?: string | null
          created_at?: string
          failure_mode_id?: string
          id?: string
          recommended_action?: string
          responsible_person?: string | null
          status?: string
          target_completion_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pfmea_action_items_failure_mode_id_fkey"
            columns: ["failure_mode_id"]
            isOneToOne: false
            referencedRelation: "pfmea_failure_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      pfmea_controls: {
        Row: {
          cause_id: string | null
          control_description: string
          control_type: string
          created_at: string
          detection_score: number | null
          failure_mode_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          cause_id?: string | null
          control_description?: string
          control_type: string
          created_at?: string
          detection_score?: number | null
          failure_mode_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          cause_id?: string | null
          control_description?: string
          control_type?: string
          created_at?: string
          detection_score?: number | null
          failure_mode_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pfmea_controls_cause_id_fkey"
            columns: ["cause_id"]
            isOneToOne: false
            referencedRelation: "pfmea_potential_causes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pfmea_controls_failure_mode_id_fkey"
            columns: ["failure_mode_id"]
            isOneToOne: false
            referencedRelation: "pfmea_failure_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      pfmea_failure_modes: {
        Row: {
          created_at: string
          failure_mode: string
          id: string
          operation_step_id: string
          project_id: string
          requirement_output_id: string
          severity_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          failure_mode: string
          id?: string
          operation_step_id: string
          project_id: string
          requirement_output_id: string
          severity_score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          failure_mode?: string
          id?: string
          operation_step_id?: string
          project_id?: string
          requirement_output_id?: string
          severity_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pfmea_failure_modes_operation_step_id_fkey"
            columns: ["operation_step_id"]
            isOneToOne: false
            referencedRelation: "operation_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pfmea_failure_modes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pfmea_potential_causes: {
        Row: {
          cause_description: string
          created_at: string
          failure_mode_id: string
          id: string
          occurrence_score: number
          updated_at: string
        }
        Insert: {
          cause_description?: string
          created_at?: string
          failure_mode_id: string
          id?: string
          occurrence_score?: number
          updated_at?: string
        }
        Update: {
          cause_description?: string
          created_at?: string
          failure_mode_id?: string
          id?: string
          occurrence_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pfmea_potential_causes_failure_mode_id_fkey"
            columns: ["failure_mode_id"]
            isOneToOne: false
            referencedRelation: "pfmea_failure_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      pfmea_potential_effects: {
        Row: {
          created_at: string
          effect_description: string
          failure_mode_id: string
          id: string
          severity_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          effect_description?: string
          failure_mode_id: string
          id?: string
          severity_score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          effect_description?: string
          failure_mode_id?: string
          id?: string
          severity_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pfmea_potential_effects_failure_mode_id_fkey"
            columns: ["failure_mode_id"]
            isOneToOne: false
            referencedRelation: "pfmea_failure_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      pfmea_scoring: {
        Row: {
          cause_detection: string | null
          created_at: string
          criterion_type: string
          detection_method_guidance: string | null
          failure_mode_detection: string | null
          id: string
          mistake_proofing_requirement: string | null
          occurrence_frequency_scale: string | null
          occurrence_time_scale: string | null
          prevention_control_examples: string | null
          process_effects: string | null
          process_examples: string | null
          quality_effects: string | null
          quality_examples: string | null
          score: number
          typical_detection_note: string | null
          typical_occurrence_note: string | null
        }
        Insert: {
          cause_detection?: string | null
          created_at?: string
          criterion_type: string
          detection_method_guidance?: string | null
          failure_mode_detection?: string | null
          id?: string
          mistake_proofing_requirement?: string | null
          occurrence_frequency_scale?: string | null
          occurrence_time_scale?: string | null
          prevention_control_examples?: string | null
          process_effects?: string | null
          process_examples?: string | null
          quality_effects?: string | null
          quality_examples?: string | null
          score: number
          typical_detection_note?: string | null
          typical_occurrence_note?: string | null
        }
        Update: {
          cause_detection?: string | null
          created_at?: string
          criterion_type?: string
          detection_method_guidance?: string | null
          failure_mode_detection?: string | null
          id?: string
          mistake_proofing_requirement?: string | null
          occurrence_frequency_scale?: string | null
          occurrence_time_scale?: string | null
          prevention_control_examples?: string | null
          process_effects?: string | null
          process_examples?: string | null
          quality_effects?: string | null
          quality_examples?: string | null
          score?: number
          typical_detection_note?: string | null
          typical_occurrence_note?: string | null
        }
        Relationships: []
      }
      phase_operations: {
        Row: {
          created_at: string
          display_order: number
          estimated_time: string | null
          flow_type: string | null
          id: string
          operation_description: string | null
          operation_name: string
          phase_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          estimated_time?: string | null
          flow_type?: string | null
          id?: string
          operation_description?: string | null
          operation_name: string
          phase_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          estimated_time?: string | null
          flow_type?: string | null
          id?: string
          operation_description?: string | null
          operation_name?: string
          phase_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_operations_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_notification_settings: {
        Row: {
          created_at: string
          daily_notification_local_time: string | null
          email_address: string | null
          email_enabled: boolean
          id: string
          last_daily_task_digest_for_local_date: string | null
          notify_daily_celebrations: boolean
          notify_daily_task_status: boolean
          notify_weekly_budget: boolean
          phone_number: string | null
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_notification_local_time?: string | null
          email_address?: string | null
          email_enabled?: boolean
          id?: string
          last_daily_task_digest_for_local_date?: string | null
          notify_daily_celebrations?: boolean
          notify_daily_task_status?: boolean
          notify_weekly_budget?: boolean
          phone_number?: string | null
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_notification_local_time?: string | null
          email_address?: string | null
          email_enabled?: boolean
          id?: string
          last_daily_task_digest_for_local_date?: string | null
          notify_daily_celebrations?: boolean
          notify_daily_task_status?: boolean
          notify_weekly_budget?: boolean
          phone_number?: string | null
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_communication_plans: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          project_run_id: string
          sms_early_access_opt_in: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          project_run_id: string
          sms_early_access_opt_in?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          project_run_id?: string
          sms_early_access_opt_in?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_communication_plans_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: true
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_owners: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          invitation_status: string | null
          invitation_token: string | null
          invited_by: string | null
          invited_email: string | null
          invited_user_id: string | null
          project_id: string | null
          terms_version: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          invitation_status?: string | null
          invitation_token?: string | null
          invited_by?: string | null
          invited_email?: string | null
          invited_user_id?: string | null
          project_id?: string | null
          terms_version?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          invitation_status?: string | null
          invitation_token?: string | null
          invited_by?: string | null
          invited_email?: string | null
          invited_user_id?: string | null
          project_id?: string | null
          terms_version?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_owners_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_linked: boolean | null
          is_standard: boolean | null
          name: string
          position_rule: string | null
          position_value: number | null
          project_id: string
          source_phase_id: string | null
          source_project_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_linked?: boolean | null
          is_standard?: boolean | null
          name: string
          position_rule?: string | null
          position_value?: number | null
          project_id: string
          source_phase_id?: string | null
          source_project_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_linked?: boolean | null
          is_standard?: boolean | null
          name?: string
          position_rule?: string | null
          position_value?: number | null
          project_id?: string
          source_phase_id?: string | null
          source_project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_source_phase_id_fkey"
            columns: ["source_phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_plans: {
        Row: {
          contingency_percent: number
          created_at: string
          description: string
          id: string
          line_items: Json
          name: string
          notes: string
          sales_tax_percent: number
          state: string
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contingency_percent?: number
          created_at?: string
          description?: string
          id?: string
          line_items?: Json
          name: string
          notes?: string
          sales_tax_percent?: number
          state?: string
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contingency_percent?: number
          created_at?: string
          description?: string
          id?: string
          line_items?: Json
          name?: string
          notes?: string
          sales_tax_percent?: number
          state?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_risks: {
        Row: {
          benefit: string | null
          budget_impact_high: number | null
          budget_impact_low: number | null
          created_at: string | null
          display_order: number | null
          id: string
          impact: string | null
          likelihood: string | null
          mitigation_actions: Json | null
          mitigation_cost: number | null
          mitigation_effort_level: string | null
          mitigation_strategy: string | null
          project_id: string
          recommendation: string | null
          risk_description: string | null
          risk_title: string
          schedule_impact_high_days: number | null
          schedule_impact_low_days: number | null
          severity: string | null
          updated_at: string | null
        }
        Insert: {
          benefit?: string | null
          budget_impact_high?: number | null
          budget_impact_low?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          impact?: string | null
          likelihood?: string | null
          mitigation_actions?: Json | null
          mitigation_cost?: number | null
          mitigation_effort_level?: string | null
          mitigation_strategy?: string | null
          project_id: string
          recommendation?: string | null
          risk_description?: string | null
          risk_title: string
          schedule_impact_high_days?: number | null
          schedule_impact_low_days?: number | null
          severity?: string | null
          updated_at?: string | null
        }
        Update: {
          benefit?: string | null
          budget_impact_high?: number | null
          budget_impact_low?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          impact?: string | null
          likelihood?: string | null
          mitigation_actions?: Json | null
          mitigation_cost?: number | null
          mitigation_effort_level?: string | null
          mitigation_strategy?: string | null
          project_id?: string
          recommendation?: string | null
          risk_description?: string | null
          risk_title?: string
          schedule_impact_high_days?: number | null
          schedule_impact_low_days?: number | null
          severity?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_run_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          operation_name: string | null
          phase_name: string | null
          photo_type: string | null
          photo_url: string
          project_run_id: string
          space_id: string | null
          step_title: string | null
          taken_at: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          operation_name?: string | null
          phase_name?: string | null
          photo_type?: string | null
          photo_url: string
          project_run_id: string
          space_id?: string | null
          step_title?: string | null
          taken_at?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          operation_name?: string | null
          phase_name?: string | null
          photo_type?: string | null
          photo_url?: string
          project_run_id?: string
          space_id?: string | null
          step_title?: string | null
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_run_photos_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_run_planning_change_events: {
        Row: {
          change_detail: Json | null
          change_summary: string
          id: string
          occurred_at: string
          planning_tool: string
          project_run_id: string
          user_id: string
        }
        Insert: {
          change_detail?: Json | null
          change_summary: string
          id?: string
          occurred_at?: string
          planning_tool: string
          project_run_id: string
          user_id: string
        }
        Update: {
          change_detail?: Json | null
          change_summary?: string
          id?: string
          occurred_at?: string
          planning_tool?: string
          project_run_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_run_planning_change_events_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_run_risks: {
        Row: {
          benefit: string | null
          budget_impact_high: number | null
          budget_impact_low: number | null
          created_at: string | null
          display_order: number | null
          from_standard_foundation: boolean
          hidden_from_register: boolean
          id: string
          impact: string | null
          likelihood: string | null
          mitigation_actions: Json | null
          mitigation_cost: number | null
          mitigation_effort_level: string | null
          mitigation_strategy: string | null
          project_run_id: string
          recommendation: string | null
          risk_description: string | null
          risk_title: string
          schedule_impact_high_days: number | null
          schedule_impact_low_days: number | null
          severity: string | null
          status: string | null
          template_risk_id: string | null
          updated_at: string | null
        }
        Insert: {
          benefit?: string | null
          budget_impact_high?: number | null
          budget_impact_low?: number | null
          created_at?: string | null
          display_order?: number | null
          from_standard_foundation?: boolean
          hidden_from_register?: boolean
          id?: string
          impact?: string | null
          likelihood?: string | null
          mitigation_actions?: Json | null
          mitigation_cost?: number | null
          mitigation_effort_level?: string | null
          mitigation_strategy?: string | null
          project_run_id: string
          recommendation?: string | null
          risk_description?: string | null
          risk_title: string
          schedule_impact_high_days?: number | null
          schedule_impact_low_days?: number | null
          severity?: string | null
          status?: string | null
          template_risk_id?: string | null
          updated_at?: string | null
        }
        Update: {
          benefit?: string | null
          budget_impact_high?: number | null
          budget_impact_low?: number | null
          created_at?: string | null
          display_order?: number | null
          from_standard_foundation?: boolean
          hidden_from_register?: boolean
          id?: string
          impact?: string | null
          likelihood?: string | null
          mitigation_actions?: Json | null
          mitigation_cost?: number | null
          mitigation_effort_level?: string | null
          mitigation_strategy?: string | null
          project_run_id?: string
          recommendation?: string | null
          risk_description?: string | null
          risk_title?: string
          schedule_impact_high_days?: number | null
          schedule_impact_low_days?: number | null
          severity?: string | null
          status?: string | null
          template_risk_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_run_risks_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_run_spaces: {
        Row: {
          created_at: string
          home_space_id: string | null
          id: string
          is_from_home: boolean | null
          priority: number | null
          project_run_id: string
          scale_unit: string | null
          scale_value: number | null
          sizing_by_unit: Json | null
          space_name: string
          space_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          home_space_id?: string | null
          id?: string
          is_from_home?: boolean | null
          priority?: number | null
          project_run_id: string
          scale_unit?: string | null
          scale_value?: number | null
          sizing_by_unit?: Json | null
          space_name: string
          space_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          home_space_id?: string | null
          id?: string
          is_from_home?: boolean | null
          priority?: number | null
          project_run_id?: string
          scale_unit?: string | null
          scale_value?: number | null
          sizing_by_unit?: Json | null
          space_name?: string
          space_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_run_spaces_home_space_id_fkey"
            columns: ["home_space_id"]
            isOneToOne: false
            referencedRelation: "home_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_run_spaces_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_run_step_instructions: {
        Row: {
          content: Json
          created_at: string
          id: string
          instruction_level: string
          project_run_id: string
          template_step_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          instruction_level: string
          project_run_id: string
          template_step_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          instruction_level?: string
          project_run_id?: string
          template_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_run_step_instructions_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_runs: {
        Row: {
          accountability_partner: string | null
          actual_end_date: string | null
          budget_data: Json | null
          category: string | null
          completed_steps: Json | null
          created_at: string
          current_operation_id: string | null
          current_phase_id: string | null
          current_step_id: string | null
          custom_project_name: string | null
          customization_decisions: Json | null
          description: string | null
          effort_level: string | null
          end_date: string | null
          estimated_time: string | null
          estimated_total_time: string | null
          home_id: string | null
          id: string
          initial_budget: string | null
          initial_sizing: Json | null
          initial_timeline: string | null
          instruction_level_preference: string | null
          is_manual_entry: boolean | null
          issue_reports: Json | null
          item_type: string | null
          name: string
          notes_data: Json
          phase_ratings: Json | null
          phases: Json | null
          plan_end_date: string | null
          planning_completed_at: string | null
          planning_scope_baseline: Json | null
          progress: number | null
          progress_reporting_style: string | null
          project_challenges: string | null
          project_id: string | null
          project_leader: string | null
          project_photos: Json | null
          quality_control_settings: Json | null
          scaling_unit: string | null
          schedule_events: Json | null
          schedule_optimization_method: string | null
          shopping_checklist_data: Json | null
          skill_level: string | null
          start_date: string | null
          status: string | null
          time_tracking: Json | null
          typical_project_size: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accountability_partner?: string | null
          actual_end_date?: string | null
          budget_data?: Json | null
          category?: string | null
          completed_steps?: Json | null
          created_at?: string
          current_operation_id?: string | null
          current_phase_id?: string | null
          current_step_id?: string | null
          custom_project_name?: string | null
          customization_decisions?: Json | null
          description?: string | null
          effort_level?: string | null
          end_date?: string | null
          estimated_time?: string | null
          estimated_total_time?: string | null
          home_id?: string | null
          id?: string
          initial_budget?: string | null
          initial_sizing?: Json | null
          initial_timeline?: string | null
          instruction_level_preference?: string | null
          is_manual_entry?: boolean | null
          issue_reports?: Json | null
          item_type?: string | null
          name: string
          notes_data?: Json
          phase_ratings?: Json | null
          phases?: Json | null
          plan_end_date?: string | null
          planning_completed_at?: string | null
          planning_scope_baseline?: Json | null
          progress?: number | null
          progress_reporting_style?: string | null
          project_challenges?: string | null
          project_id?: string | null
          project_leader?: string | null
          project_photos?: Json | null
          quality_control_settings?: Json | null
          scaling_unit?: string | null
          schedule_events?: Json | null
          schedule_optimization_method?: string | null
          shopping_checklist_data?: Json | null
          skill_level?: string | null
          start_date?: string | null
          status?: string | null
          time_tracking?: Json | null
          typical_project_size?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accountability_partner?: string | null
          actual_end_date?: string | null
          budget_data?: Json | null
          category?: string | null
          completed_steps?: Json | null
          created_at?: string
          current_operation_id?: string | null
          current_phase_id?: string | null
          current_step_id?: string | null
          custom_project_name?: string | null
          customization_decisions?: Json | null
          description?: string | null
          effort_level?: string | null
          end_date?: string | null
          estimated_time?: string | null
          estimated_total_time?: string | null
          home_id?: string | null
          id?: string
          initial_budget?: string | null
          initial_sizing?: Json | null
          initial_timeline?: string | null
          instruction_level_preference?: string | null
          is_manual_entry?: boolean | null
          issue_reports?: Json | null
          item_type?: string | null
          name?: string
          notes_data?: Json
          phase_ratings?: Json | null
          phases?: Json | null
          plan_end_date?: string | null
          planning_completed_at?: string | null
          planning_scope_baseline?: Json | null
          progress?: number | null
          progress_reporting_style?: string | null
          project_challenges?: string | null
          project_id?: string | null
          project_leader?: string | null
          project_photos?: Json | null
          quality_control_settings?: Json | null
          scaling_unit?: string | null
          schedule_events?: Json | null
          schedule_optimization_method?: string | null
          shopping_checklist_data?: Json | null
          skill_level?: string | null
          start_date?: string | null
          status?: string | null
          time_tracking?: Json | null
          typical_project_size?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_runs_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_per_typical_size: string | null
          budget_per_unit: string | null
          category: string[] | null
          cover_image: string | null
          created_at: string
          description: string | null
          effort_level: string | null
          estimated_cost: string | null
          estimated_time: string | null
          estimated_total_time: string | null
          icon: string | null
          id: string
          images: string[] | null
          instructions_data_sources: string | null
          is_current_version: boolean | null
          is_popular: boolean
          is_standard: boolean | null
          item_type: string | null
          name: string
          parent_project_id: string | null
          phases: Json | null
          project_challenges: string | null
          project_type: string | null
          publish_status: string | null
          release_date: string | null
          revision_notes: string | null
          revision_number: number | null
          scaling_unit: string | null
          scheduling_prerequisites: Json
          skill_level: string | null
          tags: string[] | null
          typical_project_size: number | null
          updated_at: string
          user_id: string | null
          visibility_status: string
        }
        Insert: {
          budget_per_typical_size?: string | null
          budget_per_unit?: string | null
          category?: string[] | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          effort_level?: string | null
          estimated_cost?: string | null
          estimated_time?: string | null
          estimated_total_time?: string | null
          icon?: string | null
          id?: string
          images?: string[] | null
          instructions_data_sources?: string | null
          is_current_version?: boolean | null
          is_popular?: boolean
          is_standard?: boolean | null
          item_type?: string | null
          name: string
          parent_project_id?: string | null
          phases?: Json | null
          project_challenges?: string | null
          project_type?: string | null
          publish_status?: string | null
          release_date?: string | null
          revision_notes?: string | null
          revision_number?: number | null
          scaling_unit?: string | null
          scheduling_prerequisites?: Json
          skill_level?: string | null
          tags?: string[] | null
          typical_project_size?: number | null
          updated_at?: string
          user_id?: string | null
          visibility_status?: string
        }
        Update: {
          budget_per_typical_size?: string | null
          budget_per_unit?: string | null
          category?: string[] | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          effort_level?: string | null
          estimated_cost?: string | null
          estimated_time?: string | null
          estimated_total_time?: string | null
          icon?: string | null
          id?: string
          images?: string[] | null
          instructions_data_sources?: string | null
          is_current_version?: boolean | null
          is_popular?: boolean
          is_standard?: boolean | null
          item_type?: string | null
          name?: string
          parent_project_id?: string | null
          phases?: Json | null
          project_challenges?: string | null
          project_type?: string | null
          publish_status?: string | null
          release_date?: string | null
          revision_notes?: string | null
          revision_number?: number | null
          scaling_unit?: string | null
          scheduling_prerequisites?: Json
          skill_level?: string | null
          tags?: string[] | null
          typical_project_size?: number | null
          updated_at?: string
          user_id?: string | null
          visibility_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rework_events: {
        Row: {
          applied_at: string | null
          comments: string | null
          created_at: string
          id: string
          phase_id: string | null
          phase_name: string | null
          photo_paths: string[]
          project_run_id: string
          recovery_plan: Json
          resolved_at: string | null
          severity: string
          status: string
          step_id: string | null
          step_title: string | null
          template_family: string | null
          template_project_id: string | null
          triage_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          phase_id?: string | null
          phase_name?: string | null
          photo_paths?: string[]
          project_run_id: string
          recovery_plan?: Json
          resolved_at?: string | null
          severity: string
          status?: string
          step_id?: string | null
          step_title?: string | null
          template_family?: string | null
          template_project_id?: string | null
          triage_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          phase_id?: string | null
          phase_name?: string | null
          photo_paths?: string[]
          project_run_id?: string
          recovery_plan?: Json
          resolved_at?: string | null
          severity?: string
          status?: string
          step_id?: string | null
          step_title?: string | null
          template_family?: string | null
          template_project_id?: string | null
          triage_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rework_events_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rework_events_template_project_id_fkey"
            columns: ["template_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      role_audit_log: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_role: string
          old_role: string | null
          reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_role: string
          old_role?: string | null
          reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_role?: string
          old_role?: string | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      session_fingerprints: {
        Row: {
          created_at: string
          fingerprint_hash: string
          id: string
          ip_address: unknown
          last_verified_at: string
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint_hash: string
          id?: string
          ip_address?: unknown
          last_verified_at?: string
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint_hash?: string
          id?: string
          ip_address?: unknown
          last_verified_at?: string
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      step_instructions: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          instruction_level: string
          step_id: string
          updated_at: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          id?: string
          instruction_level: string
          step_id: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          instruction_level?: string
          step_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "step_instructions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "operation_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          price_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          price_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          price_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stuck_events: {
        Row: {
          created_at: string
          id: string
          phase_id: string | null
          project_run_id: string | null
          resolution_action: string | null
          rework_event_id: string | null
          step_id: string | null
          step_title: string | null
          template_family: string | null
          template_project_id: string | null
          thumbs: number | null
          time_to_unstick_seconds: number | null
          triage_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phase_id?: string | null
          project_run_id?: string | null
          resolution_action?: string | null
          rework_event_id?: string | null
          step_id?: string | null
          step_title?: string | null
          template_family?: string | null
          template_project_id?: string | null
          thumbs?: number | null
          time_to_unstick_seconds?: number | null
          triage_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phase_id?: string | null
          project_run_id?: string | null
          resolution_action?: string | null
          rework_event_id?: string | null
          step_id?: string | null
          step_title?: string | null
          template_family?: string | null
          template_project_id?: string | null
          thumbs?: number | null
          time_to_unstick_seconds?: number | null
          triage_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stuck_events_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stuck_events_rework_event_id_fkey"
            columns: ["rework_event_id"]
            isOneToOne: false
            referencedRelation: "rework_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stuck_events_template_project_id_fkey"
            columns: ["template_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_shopping_list: {
        Row: {
          id: string
          material_name: string
          quantity: number
          shopped: boolean
          task_id: string
          user_id: string
        }
        Insert: {
          id?: string
          material_name?: string
          quantity?: number
          shopped?: boolean
          task_id: string
          user_id: string
        }
        Update: {
          id?: string
          material_name?: string
          quantity?: number
          shopped?: boolean
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_shopping_list_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "home_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_variations: {
        Row: {
          attribute_definitions: Json
          attributes: Json
          core_item_id: string
          created_at: string | null
          description: string | null
          estimated_rental_lifespan_days: number | null
          estimated_weight_lbs: number | null
          id: string
          instructions: Json | null
          name: string
          photo_url: string | null
          pricing: Json | null
          quick_add: boolean | null
          sku: string | null
          updated_at: string | null
          warning_flags: string[] | null
        }
        Insert: {
          attribute_definitions?: Json
          attributes?: Json
          core_item_id: string
          created_at?: string | null
          description?: string | null
          estimated_rental_lifespan_days?: number | null
          estimated_weight_lbs?: number | null
          id: string
          instructions?: Json | null
          name: string
          photo_url?: string | null
          pricing?: Json | null
          quick_add?: boolean | null
          sku?: string | null
          updated_at?: string | null
          warning_flags?: string[] | null
        }
        Update: {
          attribute_definitions?: Json
          attributes?: Json
          core_item_id?: string
          created_at?: string | null
          description?: string | null
          estimated_rental_lifespan_days?: number | null
          estimated_weight_lbs?: number | null
          id?: string
          instructions?: Json | null
          name?: string
          photo_url?: string | null
          pricing?: Json | null
          quick_add?: boolean | null
          sku?: string | null
          updated_at?: string | null
          warning_flags?: string[] | null
        }
        Relationships: []
      }
      tools: {
        Row: {
          alternates: string | null
          attribute_definitions: Json
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          instructions: Json | null
          name: string
          photo_url: string | null
          specialty_scale: number
          updated_at: string
        }
        Insert: {
          alternates?: string | null
          attribute_definitions?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          instructions?: Json | null
          name: string
          photo_url?: string | null
          specialty_scale?: number
          updated_at?: string
        }
        Update: {
          alternates?: string | null
          attribute_definitions?: Json
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          instructions?: Json | null
          name?: string
          photo_url?: string | null
          specialty_scale?: number
          updated_at?: string
        }
        Relationships: []
      }
      usage_agreements: {
        Row: {
          agreed_at: string
          agreement_type: string
          created_at: string
          id: string
          pdf_storage_path: string | null
          project_id: string | null
          user_id: string
        }
        Insert: {
          agreed_at?: string
          agreement_type?: string
          created_at?: string
          id?: string
          pdf_storage_path?: string | null
          project_id?: string | null
          user_id: string
        }
        Update: {
          agreed_at?: string
          agreement_type?: string
          created_at?: string
          id?: string
          pdf_storage_path?: string | null
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_agreements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          created_at: string
          earned_at: string
          id: string
          is_read: boolean
          notification_sent: boolean
          phase_name: string | null
          project_run_id: string | null
          reason: string | null
          type: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          achievement_id?: string | null
          created_at?: string
          earned_at?: string
          id?: string
          is_read?: boolean
          notification_sent?: boolean
          phase_name?: string | null
          project_run_id?: string | null
          reason?: string | null
          type?: string
          user_id: string
          xp_amount?: number
        }
        Update: {
          achievement_id?: string | null
          created_at?: string
          earned_at?: string
          id?: string
          is_read?: boolean
          notification_sent?: boolean
          phase_name?: string | null
          project_run_id?: string | null
          reason?: string | null
          type?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contractors: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          insurance_verified: boolean | null
          license_number: string | null
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          trade: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insurance_verified?: boolean | null
          license_number?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          trade?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insurance_verified?: boolean | null
          license_number?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          trade?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_maintenance_tasks: {
        Row: {
          benefits_of_maintenance: string | null
          category: string | null
          created_at: string
          criticality: number | null
          description: string | null
          frequency_days: number
          home_id: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          last_completed: string | null
          maintenance_template_id: string | null
          next_due: string
          priority: string | null
          progress_percentage: number | null
          recurrence_start_date: string | null
          repair_cost_savings: string | null
          risks_of_skipping: string | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          benefits_of_maintenance?: string | null
          category?: string | null
          created_at?: string
          criticality?: number | null
          description?: string | null
          frequency_days: number
          home_id?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          last_completed?: string | null
          maintenance_template_id?: string | null
          next_due: string
          priority?: string | null
          progress_percentage?: number | null
          recurrence_start_date?: string | null
          repair_cost_savings?: string | null
          risks_of_skipping?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          benefits_of_maintenance?: string | null
          category?: string | null
          created_at?: string
          criticality?: number | null
          description?: string | null
          frequency_days?: number
          home_id?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          last_completed?: string | null
          maintenance_template_id?: string | null
          next_due?: string
          priority?: string | null
          progress_percentage?: number | null
          recurrence_start_date?: string | null
          repair_cost_savings?: string | null
          risks_of_skipping?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_maintenance_tasks_home_id_fkey"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_maintenance_tasks_maintenance_template_id_fkey"
            columns: ["maintenance_template_id"]
            isOneToOne: false
            referencedRelation: "maintenance_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_materials: {
        Row: {
          brand: string | null
          created_at: string
          description: string | null
          id: string
          material_id: string
          name: string
          purchase_location: string | null
          quantity: number
          unit: string | null
          unit_size: string | null
          updated_at: string
          user_id: string
          user_photo_url: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          description?: string | null
          id?: string
          material_id: string
          name: string
          purchase_location?: string | null
          quantity: number
          unit?: string | null
          unit_size?: string | null
          updated_at?: string
          user_id: string
          user_photo_url?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          description?: string | null
          id?: string
          material_id?: string
          name?: string
          purchase_location?: string | null
          quantity?: number
          unit?: string | null
          unit_size?: string | null
          updated_at?: string
          user_id?: string
          user_photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avoid_projects: string[] | null
          created_at: string
          do_not_show_workflow_tutorial: boolean
          full_name: string | null
          home_build_year: string | null
          home_ownership: string | null
          home_state: string | null
          id: string
          nickname: string | null
          owned_materials: Json
          owned_tools: Json | null
          personality_profile: Json | null
          physical_capability: string | null
          preferred_learning_methods: string[] | null
          project_focus: string | null
          project_skills: Json | null
          roles: string[]
          skill_level: string | null
          survey_completed_at: string | null
          time_zone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avoid_projects?: string[] | null
          created_at?: string
          do_not_show_workflow_tutorial?: boolean
          full_name?: string | null
          home_build_year?: string | null
          home_ownership?: string | null
          home_state?: string | null
          id?: string
          nickname?: string | null
          owned_materials?: Json
          owned_tools?: Json | null
          personality_profile?: Json | null
          physical_capability?: string | null
          preferred_learning_methods?: string[] | null
          project_focus?: string | null
          project_skills?: Json | null
          roles?: string[]
          skill_level?: string | null
          survey_completed_at?: string | null
          time_zone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avoid_projects?: string[] | null
          created_at?: string
          do_not_show_workflow_tutorial?: boolean
          full_name?: string | null
          home_build_year?: string | null
          home_ownership?: string | null
          home_state?: string | null
          id?: string
          nickname?: string | null
          owned_materials?: Json
          owned_tools?: Json | null
          personality_profile?: Json | null
          physical_capability?: string | null
          preferred_learning_methods?: string[] | null
          project_focus?: string | null
          project_skills?: Json | null
          roles?: string[]
          skill_level?: string | null
          survey_completed_at?: string | null
          time_zone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_project_skill_levels: {
        Row: {
          created_at: string
          id: string
          project_id: string
          skill_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          skill_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          skill_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_project_skill_levels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_projects_runtime: {
        Row: {
          canonical_step_id: string
          created_at: string
          ended_at: string | null
          id: string
          project_run_id: string
          started_at: string | null
          step_id: string
          updated_at: string
        }
        Insert: {
          canonical_step_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          project_run_id: string
          started_at?: string | null
          step_id: string
          updated_at?: string
        }
        Update: {
          canonical_step_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          project_run_id?: string
          started_at?: string | null
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_projects_runtime_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          id: string
          ip_address: unknown
          is_active: boolean
          session_end: string | null
          session_start: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: unknown
          is_active?: boolean
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: unknown
          is_active?: boolean
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_tools: {
        Row: {
          created_at: string
          description: string | null
          id: string
          model_name: string | null
          name: string
          quantity: number
          tool_id: string
          updated_at: string
          user_id: string
          user_photo_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          model_name?: string | null
          name: string
          quantity: number
          tool_id: string
          updated_at?: string
          user_id: string
          user_photo_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          model_name?: string | null
          name?: string
          quantity?: number
          tool_id?: string
          updated_at?: string
          user_id?: string
          user_photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      feature_requests_public: {
        Row: {
          admin_response: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          priority_request: string | null
          roadmap_item_id: string | null
          status: string | null
          submitted_by: string | null
          title: string | null
          updated_at: string | null
          votes: number | null
        }
        Insert: {
          admin_response?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          priority_request?: string | null
          roadmap_item_id?: string | null
          status?: string | null
          submitted_by?: string | null
          title?: string | null
          updated_at?: string | null
          votes?: number | null
        }
        Update: {
          admin_response?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          priority_request?: string | null
          roadmap_item_id?: string | null
          status?: string | null
          submitted_by?: string | null
          title?: string | null
          updated_at?: string | null
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_roadmap_item_id_fkey"
            columns: ["roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "feature_roadmap"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_project_owner_invitation: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      can_caller_edit_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      can_manage_tool_variation_catalog: { Args: never; Returns: boolean }
      check_rate_limit: {
        Args: {
          identifier: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_old_sessions: { Args: never; Returns: number }
      complete_project_owner_invitation: {
        Args: {
          p_invitation_id: string
          p_terms_version?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      copy_draft_revision_workflow: {
        Args: { p_source_project_id: string; p_target_project_id: string }
        Returns: string
      }
      copy_draft_revision_workflow_internal: {
        Args: { p_source_project_id: string; p_target_project_id: string }
        Returns: string
      }
      copy_template_risks_to_project_run: {
        Args: { p_project_run_id: string; p_template_project_id: string }
        Returns: number
      }
      create_default_home_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_project_run_snapshot: {
        Args: {
          p_home_id?: string
          p_plan_end_date?: string
          p_project_id: string
          p_run_name: string
          p_start_date?: string
          p_user_id: string
        }
        Returns: string
      }
      create_project_run_snapshot__legacy_v2rename:
        | {
            Args: {
              p_home_id?: string
              p_plan_end_date?: string
              p_run_name: string
              p_start_date?: string
              p_template_id: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_home_id?: string
              p_plan_end_date?: string
              p_run_name: string
              p_start_date?: string
              p_template_id: string
              p_user_id: string
            }
            Returns: string
          }
      create_project_run_snapshot_internal: {
        Args: {
          p_home_id?: string
          p_plan_end_date?: string
          p_project_id: string
          p_run_name: string
          p_start_date?: string
          p_user_id: string
        }
        Returns: string
      }
      create_project_with_standard_foundation: {
        Args: {
          p_category?: string
          p_created_by?: string
          p_project_description: string
          p_project_name: string
        }
        Returns: string
      }
      create_standard_project: {
        Args: {
          p_description?: string
          p_icon?: string
          p_name: string
          p_user_id?: string
        }
        Returns: string
      }
      get_help_usage_status: {
        Args: { p_user_id?: string }
        Returns: {
          capped: boolean
          message_cap: number
          message_count: number
          period_end: string
          period_start: string
          remaining: number
        }[]
      }
      get_help_usage_status_internal: {
        Args: { p_user_id?: string }
        Returns: {
          capped: boolean
          message_cap: number
          message_count: number
          period_end: string
          period_start: string
          remaining: number
        }[]
      }
      get_operation_steps_json: {
        Args: { p_is_reference?: boolean; p_operation_id: string }
        Returns: Json
      }
      get_photos_by_project_type: {
        Args: never
        Returns: {
          personal_count: number
          photo_count: number
          project_id: string
          project_partner_count: number
          public_count: number
          template_name: string
        }[]
      }
      get_photos_by_project_type_internal: {
        Args: never
        Returns: {
          personal_count: number
          photo_count: number
          project_id: string
          project_partner_count: number
          public_count: number
          template_name: string
        }[]
      }
      get_project_owner_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          expires_at: string
          id: string
          invited_email: string
          project_id: string
          project_name: string
          status: string
        }[]
      }
      get_project_workflow_with_standards: {
        Args: { p_project_id: string }
        Returns: Json
      }
      get_standard_project_template: {
        Args: never
        Returns: {
          category: string
          created_at: string
          description: string
          difficulty_level: string
          estimated_cost: string
          estimated_time: string
          icon: string
          id: string
          is_standard: boolean
          is_template: boolean
          name: string
          phases: Json
          tags: string[]
          updated_at: string
          user_id: string
          visibility: string
        }[]
      }
      get_standard_project_with_phases: { Args: never; Returns: Json }
      get_step_stuck_aggregates: {
        Args: { p_step_id?: string; p_template_family: string }
        Returns: {
          event_count: number
          step_id: string
          triage_type: string
        }[]
      }
      get_user_profiles_for_role_management: {
        Args: never
        Returns: {
          display_name: string
          email: string
          full_name: string
          nickname: string
          roles: string[]
          user_id: string
        }[]
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { check_user_id: string }; Returns: boolean }
      is_caller_admin: { Args: never; Returns: boolean }
      log_failed_login: {
        Args: {
          ip_addr?: string
          user_agent_string?: string
          user_email: string
        }
        Returns: undefined
      }
      notifications_notify_project_owners: {
        Args: {
          p_body: string
          p_metadata?: Json
          p_project_run_id: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      notifications_resolve_parent_project_id: {
        Args: { p_template_id: string }
        Returns: string
      }
      rebuild_phases_json_from_project_phases: {
        Args: { p_project_id: string }
        Returns: Json
      }
      rebuild_phases_json_from_project_phases_internal: {
        Args: { p_project_id: string }
        Returns: Json
      }
      record_trial_notification_shown: { Args: never; Returns: undefined }
      reset_project_revisions_preserve_latest: {
        Args: { p_project_id: string }
        Returns: string
      }
      set_user_role_for_management: {
        Args: { p_new_role: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
