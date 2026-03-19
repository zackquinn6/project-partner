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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievement_notifications: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          is_read: boolean | null
          project_run_id: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          project_run_id?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          project_run_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_notifications_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_notifications_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          base_xp: number | null
          category: string
          created_at: string
          criteria: Json | null
          description: string
          icon: string | null
          id: string
          name: string
          points: number | null
          scales_with_project_size: boolean | null
          updated_at: string
        }
        Insert: {
          base_xp?: number | null
          category: string
          created_at?: string
          criteria?: Json | null
          description: string
          icon?: string | null
          id?: string
          name: string
          points?: number | null
          scales_with_project_size?: boolean | null
          updated_at?: string
        }
        Update: {
          base_xp?: number | null
          category?: string
          created_at?: string
          criteria?: Json | null
          description?: string
          icon?: string | null
          id?: string
          name?: string
          points?: number | null
          scales_with_project_size?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
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
          user_email: string | null
          user_id: string | null
          user_name: string | null
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
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
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
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
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
          task_type: string | null
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
          task_type?: string | null
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
          task_type?: string | null
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
      usage_agreements: {
        Row: {
          agreement_type: string
          agreed_at: string
          created_at: string
          full_name: string
          id: string
          pdf_storage_path: string | null
          policy_text_snapshot: string | null
          policy_version: string | null
          project_id: string | null
          user_id: string
        }
        Insert: {
          agreement_type?: string
          agreed_at?: string
          created_at?: string
          full_name: string
          id?: string
          pdf_storage_path?: string | null
          policy_text_snapshot?: string | null
          policy_version?: string | null
          project_id?: string | null
          user_id: string
        }
        Update: {
          agreement_type?: string
          agreed_at?: string
          created_at?: string
          full_name?: string
          id?: string
          pdf_storage_path?: string | null
          policy_text_snapshot?: string | null
          policy_version?: string | null
          project_id?: string | null
          user_id?: string
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
      operation_steps: {
        Row: {
          allow_content_edit: boolean | null
          apps: Json | null
          content: string | null
          content_sections: Json | null
          content_type: string | null
          created_at: string
          description: string | null
          display_order: number
          flow_type: string | null
          id: string
          materials: Json | null
          number_of_workers: number | null
          operation_id: string
          outputs: Json | null
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
          content?: string | null
          content_sections?: Json | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          flow_type?: string | null
          id?: string
          materials?: Json | null
          number_of_workers?: number | null
          operation_id: string
          outputs?: Json | null
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
          content?: string | null
          content_sections?: Json | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          flow_type?: string | null
          id?: string
          materials?: Json | null
          number_of_workers?: number | null
          operation_id?: string
          outputs?: Json | null
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
      outputs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_required: boolean | null
          name: string
          notes: string | null
          type: string | null
          updated_at: string
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          notes?: string | null
          type?: string | null
          updated_at?: string
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          notes?: string | null
          type?: string | null
          updated_at?: string
          validation_rules?: Json | null
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
      pricing_data: {
        Row: {
          availability_status: string | null
          created_at: string
          currency: string | null
          id: string
          last_scraped_at: string | null
          model_id: string
          price: number | null
          product_url: string | null
          retailer: string
          updated_at: string
        }
        Insert: {
          availability_status?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          last_scraped_at?: string | null
          model_id: string
          price?: number | null
          product_url?: string | null
          retailer: string
          updated_at?: string
        }
        Update: {
          availability_status?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          last_scraped_at?: string | null
          model_id?: string
          price?: number | null
          product_url?: string | null
          retailer?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_notification_settings: {
        Row: {
          created_at: string
          email_address: string | null
          email_enabled: boolean
          id: string
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
          email_address?: string | null
          email_enabled?: boolean
          id?: string
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
          email_address?: string | null
          email_enabled?: boolean
          id?: string
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
          skill_level: string | null
          survey_completed_at: string | null
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
          skill_level?: string | null
          survey_completed_at?: string | null
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
          skill_level?: string | null
          survey_completed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_phases: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_linked: boolean | null
          is_standard: boolean | null
          name: string
          position_rule: string | null
          position_value: number | null
          project_id: string
          source_project_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_linked?: boolean | null
          is_standard?: boolean | null
          name: string
          position_rule?: string | null
          position_value?: number | null
          project_id: string
          source_project_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_linked?: boolean | null
          is_standard?: boolean | null
          name?: string
          position_rule?: string | null
          position_value?: number | null
          project_id?: string
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
      project_run_risks: {
        Row: {
          benefit: string | null
          budget_impact_high: number | null
          budget_impact_low: number | null
          created_at: string | null
          display_order: number | null
          id: string
          impact: string | null
          likelihood: string | null
          mitigation_cost: number | null
          mitigation_strategy: string | null
          project_run_id: string
          recommendation: string | null
          risk_description: string | null
          risk_title: string
          schedule_impact_high_days: number | null
          schedule_impact_low_days: number | null
          status: string | null
          severity: string | null
          template_risk_id: string | null
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
          mitigation_cost?: number | null
          mitigation_strategy?: string | null
          project_run_id: string
          recommendation?: string | null
          risk_description?: string | null
          risk_title: string
          schedule_impact_high_days?: number | null
          schedule_impact_low_days?: number | null
          status?: string | null
          severity?: string | null
          template_risk_id?: string | null
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
          mitigation_cost?: number | null
          mitigation_strategy?: string | null
          project_run_id?: string
          recommendation?: string | null
          risk_description?: string | null
          risk_title?: string
          schedule_impact_high_days?: number | null
          schedule_impact_low_days?: number | null
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
          {
            foreignKeyName: "project_run_risks_template_risk_id_fkey"
            columns: ["template_risk_id"]
            isOneToOne: false
            referencedRelation: "project_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_run_space_sizing: {
        Row: {
          created_at: string
          id: string
          scaling_unit: string
          size_value: Json
          space_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          scaling_unit: string
          size_value: Json
          space_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          scaling_unit?: string
          size_value?: Json
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_run_space_sizing_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "project_run_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_run_spaces: {
        Row: {
          created_at: string
          id: string
          is_from_home: boolean | null
          priority: number | null
          project_run_id: string
          scale_unit: string | null
          scale_value: number | null
          space_name: string
          space_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_from_home?: boolean | null
          priority?: number | null
          project_run_id: string
          scale_unit?: string | null
          scale_value?: number | null
          space_name: string
          space_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_from_home?: boolean | null
          priority?: number | null
          project_run_id?: string
          scale_unit?: string | null
          scale_value?: number | null
          space_name?: string
          space_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_run_spaces_project_run_id_fkey"
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
          end_date: string | null
          estimated_time: string | null
          home_id: string | null
          id: string
          initial_budget: string | null
          initial_sizing: Json | null
          initial_timeline: string | null
          instruction_level_preference: string | null
          is_manual_entry: boolean | null
          issue_reports: Json | null
          name: string
          phase_ratings: Json | null
          phases: Json | null
          plan_end_date: string | null
          progress: number | null
          progress_reporting_style: string | null
          project_leader: string | null
          project_photos: Json | null
          schedule_events: Json | null
          schedule_optimization_method: string | null
          shopping_checklist_data: Json | null
          start_date: string | null
          status: string | null
          template_id: string | null
          time_tracking: Json | null
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
          end_date?: string | null
          estimated_time?: string | null
          home_id?: string | null
          id?: string
          initial_budget?: string | null
          initial_sizing?: Json | null
          initial_timeline?: string | null
          instruction_level_preference?: string | null
          is_manual_entry?: boolean | null
          issue_reports?: Json | null
          name: string
          phase_ratings?: Json | null
          phases?: Json | null
          plan_end_date?: string | null
          progress?: number | null
          progress_reporting_style?: string | null
          project_leader?: string | null
          project_photos?: Json | null
          schedule_events?: Json | null
          schedule_optimization_method?: string | null
          shopping_checklist_data?: Json | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          time_tracking?: Json | null
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
          end_date?: string | null
          estimated_time?: string | null
          home_id?: string | null
          id?: string
          initial_budget?: string | null
          initial_sizing?: Json | null
          initial_timeline?: string | null
          instruction_level_preference?: string | null
          is_manual_entry?: boolean | null
          issue_reports?: Json | null
          name?: string
          phase_ratings?: Json | null
          phases?: Json | null
          plan_end_date?: string | null
          progress?: number | null
          progress_reporting_style?: string | null
          project_leader?: string | null
          project_photos?: Json | null
          schedule_events?: Json | null
          schedule_optimization_method?: string | null
          shopping_checklist_data?: Json | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          time_tracking?: Json | null
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
            foreignKeyName: "project_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      projects: {
        Row: {
          budget_per_typical_size: string | null
          budget_per_unit: string | null
          category: string[] | null
          cover_image: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          effort_level: string | null
          estimated_cost: string | null
          estimated_time: string | null
          estimated_total_time: string | null
          icon: string | null
          id: string
          images: string[] | null
          is_standard: boolean | null
          is_template: boolean | null
          item_type: string | null
          name: string
          parent_project_id: string | null
          phases: Json | null
          project_challenges: string | null
          project_type: string | null
          publish_status: string | null
          revision_notes: string | null
          revision_number: number | null
          scaling_unit: string | null
          skill_level: string | null
          tags: string[] | null
          typical_project_size: number | null
          updated_at: string
          user_id: string
          visibility_status: string
        }
        Insert: {
          budget_per_typical_size?: string | null
          budget_per_unit?: string | null
          category?: string[] | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          effort_level?: string | null
          estimated_cost?: string | null
          estimated_time?: string | null
          estimated_total_time?: string | null
          icon?: string | null
          id?: string
          images?: string[] | null
          is_standard?: boolean | null
          is_template?: boolean | null
          item_type?: string | null
          name: string
          parent_project_id?: string | null
          phases?: Json | null
          project_challenges?: string | null
          project_type?: string | null
          publish_status?: string | null
          revision_notes?: string | null
          revision_number?: number | null
          scaling_unit?: string | null
          skill_level?: string | null
          tags?: string[] | null
          typical_project_size?: number | null
          updated_at?: string
          user_id: string
          visibility_status?: string
        }
        Update: {
          budget_per_typical_size?: string | null
          budget_per_unit?: string | null
          category?: string[] | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          effort_level?: string | null
          estimated_cost?: string | null
          estimated_time?: string | null
          estimated_total_time?: string | null
          icon?: string | null
          id?: string
          images?: string[] | null
          is_standard?: boolean | null
          is_template?: boolean | null
          item_type?: string | null
          name?: string
          parent_project_id?: string | null
          phases?: Json | null
          project_challenges?: string | null
          project_type?: string | null
          publish_status?: string | null
          revision_notes?: string | null
          revision_number?: number | null
          scaling_unit?: string | null
          skill_level?: string | null
          tags?: string[] | null
          typical_project_size?: number | null
          updated_at?: string
          user_id?: string
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
          template_step_id: string
          updated_at: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          id?: string
          instruction_level: string
          template_step_id: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          instruction_level?: string
          template_step_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "step_instructions_template_step_id_fkey"
            columns: ["template_step_id"]
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
      task_shopping_list: {
        Row: {
          id: string
          material_name: string
          quantity: number
          task_id: string
          user_id: string
        }
        Insert: {
          id?: string
          material_name?: string
          quantity?: number
          task_id: string
          user_id: string
        }
        Update: {
          id?: string
          material_name?: string
          quantity?: number
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
          item_type: string
          name: string
          photo_url: string | null
          quick_add: boolean | null
          sku: string | null
          updated_at: string | null
          warning_flags: string[] | null
          weight_lbs: number | null
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
          item_type: string
          name: string
          photo_url?: string | null
          quick_add?: boolean | null
          sku?: string | null
          updated_at?: string | null
          warning_flags?: string[] | null
          weight_lbs?: number | null
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
          item_type?: string
          name?: string
          photo_url?: string | null
          quick_add?: boolean | null
          sku?: string | null
          updated_at?: string | null
          warning_flags?: string[] | null
          weight_lbs?: number | null
        }
        Relationships: []
      }
      tools: {
        Row: {
          alternates: string | null
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
      trial_tracking: {
        Row: {
          created_at: string
          id: string
          trial_end_date: string
          trial_extended_by: number | null
          trial_start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          trial_end_date: string
          trial_extended_by?: number | null
          trial_start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          trial_end_date?: string
          trial_extended_by?: number | null
          trial_start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      membership_status: {
        Row: {
          created_at: string
          id: string
          user_id: string
          updated_at: string
          member_status: boolean
          membership_start_date: string | null
          membership_end_date: string | null
          trial_start_date: string | null
          trial_end_date: string | null
          trial_extended_days: number | null
          email_sent_1day_before: boolean | null
          email_sent_on_expiry: boolean | null
          last_trial_notification_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          updated_at?: string
          member_status?: boolean
          membership_start_date?: string | null
          membership_end_date?: string | null
          trial_start_date?: string | null
          trial_end_date?: string | null
          trial_extended_days?: number | null
          email_sent_1day_before?: boolean | null
          email_sent_on_expiry?: boolean | null
          last_trial_notification_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          updated_at?: string
          member_status?: boolean
          membership_start_date?: string | null
          membership_end_date?: string | null
          trial_start_date?: string | null
          trial_end_date?: string | null
          trial_extended_days?: number | null
          email_sent_1day_before?: boolean | null
          email_sent_on_expiry?: boolean | null
          last_trial_notification_date?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          earned_at: string
          id: string
          project_run_id: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          earned_at?: string
          id?: string
          project_run_id?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          earned_at?: string
          id?: string
          project_run_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
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
          next_due: string
          priority: string | null
          progress_percentage: number | null
          repair_cost_savings: string | null
          risks_of_skipping: string | null
          summary: string | null
          template_id: string | null
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
          next_due: string
          priority?: string | null
          progress_percentage?: number | null
          repair_cost_savings?: string | null
          risks_of_skipping?: string | null
          summary?: string | null
          template_id?: string | null
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
          next_due?: string
          priority?: string | null
          progress_percentage?: number | null
          repair_cost_savings?: string | null
          risks_of_skipping?: string | null
          summary?: string | null
          template_id?: string | null
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
            foreignKeyName: "user_maintenance_tasks_template_id_fkey"
            columns: ["template_id"]
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
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
      user_xp_history: {
        Row: {
          created_at: string
          id: string
          phase_name: string | null
          project_run_id: string | null
          reason: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          phase_name?: string | null
          project_run_id?: string | null
          reason: string
          user_id: string
          xp_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          phase_name?: string | null
          project_run_id?: string | null
          reason?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_xp_history_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          identifier: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_old_sessions: { Args: never; Returns: number }
      copy_template_risks_to_project_run: {
        Args: { p_project_run_id: string; p_template_project_id: string }
        Returns: number
      }
      create_project_revision_v2: {
        Args: { revision_notes_text?: string; source_project_id: string }
        Returns: string
      }
      create_project_run_snapshot_v2: {
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
      create_project_with_standard_foundation_v2: {
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
      is_admin: { Args: { check_user_id?: string }; Returns: boolean }
      log_failed_login: {
        Args: {
          ip_addr?: string
          user_agent_string?: string
          user_email: string
        }
        Returns: undefined
      }
      rebuild_phases_json_from_project_phases: {
        Args: { p_project_id: string }
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
    Enums: {},
  },
} as const
