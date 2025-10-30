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
          criteria: Json
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
          criteria?: Json
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
          criteria?: Json
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
          is_active: boolean
          sensitive_data_accessed: boolean
          session_end: string | null
          session_start: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          sensitive_data_accessed?: boolean
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean
          sensitive_data_accessed?: boolean
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      ai_repair_analyses: {
        Row: {
          action_plan: string | null
          analysis_result: Json
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
          analysis_result?: Json
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
          analysis_result?: Json
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
      decision_tree_conditions: {
        Row: {
          condition_data: Json
          condition_type: string
          created_at: string
          id: string
          is_fallback: boolean
          next_operation_id: string | null
          operation_id: string
          priority: number
          updated_at: string
        }
        Insert: {
          condition_data?: Json
          condition_type: string
          created_at?: string
          id?: string
          is_fallback?: boolean
          next_operation_id?: string | null
          operation_id: string
          priority?: number
          updated_at?: string
        }
        Update: {
          condition_data?: Json
          condition_type?: string
          created_at?: string
          id?: string
          is_fallback?: boolean
          next_operation_id?: string | null
          operation_id?: string
          priority?: number
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
          execution_status: string
          execution_timestamp: string
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
          execution_status?: string
          execution_timestamp?: string
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
          execution_status?: string
          execution_timestamp?: string
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
          display_order: number
          fallback_operation_id: string | null
          id: string
          is_optional: boolean
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
          display_order?: number
          fallback_operation_id?: string | null
          id?: string
          is_optional?: boolean
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
          display_order?: number
          fallback_operation_id?: string | null
          id?: string
          is_optional?: boolean
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
          is_active: boolean
          name: string
          project_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          project_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempt_time: string
          email: string
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string
          email: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string
          email?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          admin_notes: string | null
          admin_response: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority_request: string
          roadmap_item_id: string | null
          status: string
          submitted_by: string | null
          title: string
          updated_at: string
          votes: number
        }
        Insert: {
          admin_notes?: string | null
          admin_response?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          priority_request?: string
          roadmap_item_id?: string | null
          status?: string
          submitted_by?: string | null
          title: string
          updated_at?: string
          votes?: number
        }
        Update: {
          admin_notes?: string | null
          admin_response?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority_request?: string
          roadmap_item_id?: string | null
          status?: string
          submitted_by?: string | null
          title?: string
          updated_at?: string
          votes?: number
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
          category: string
          completion_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          priority: string
          status: string
          target_date: string | null
          title: string
          updated_at: string
          votes: number
        }
        Insert: {
          category?: string
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          priority?: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          votes?: number
        }
        Update: {
          category?: string
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          priority?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          votes?: number
        }
        Relationships: []
      }
      feature_votes: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
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
          status: string
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
          status?: string
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
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      home_details: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          home_age: number | null
          home_id: string
          id: string
          last_synced_at: string | null
          square_footage: number | null
          updated_at: string
          zillow_url: string | null
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          home_age?: number | null
          home_id: string
          id?: string
          last_synced_at?: string | null
          square_footage?: number | null
          updated_at?: string
          zillow_url?: string | null
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          home_age?: number | null
          home_id?: string
          id?: string
          last_synced_at?: string | null
          square_footage?: number | null
          updated_at?: string
          zillow_url?: string | null
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
            foreignKeyName: "home_risk_mitigations_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "home_risks"
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
          risk_level?: string
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
          space_type: string
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
          space_type?: string
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
          space_type?: string
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
          scheduled_hours: number
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
          scheduled_hours?: number
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
          scheduled_hours?: number
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
          available_days: string[]
          available_hours: number
          consecutive_days: number
          created_at: string
          diy_level: string
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
          available_days?: string[]
          available_hours?: number
          consecutive_days?: number
          created_at?: string
          diy_level?: string
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
          available_days?: string[]
          available_hours?: number
          consecutive_days?: number
          created_at?: string
          diy_level?: string
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
          assignments_count: number
          created_at: string
          generated_at: string
          home_id: string | null
          id: string
          schedule_data: Json
          start_date: string
          unassigned: Json | null
          updated_at: string
          user_id: string
          warnings: Json | null
        }
        Insert: {
          assignments_count?: number
          created_at?: string
          generated_at?: string
          home_id?: string | null
          id?: string
          schedule_data?: Json
          start_date: string
          unassigned?: Json | null
          updated_at?: string
          user_id: string
          warnings?: Json | null
        }
        Update: {
          assignments_count?: number
          created_at?: string
          generated_at?: string
          home_id?: string | null
          id?: string
          schedule_data?: Json
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
          completed: boolean
          created_at: string
          diy_level: string
          estimated_hours: number
          id: string
          order_index: number
          task_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_person_id?: string | null
          completed?: boolean
          created_at?: string
          diy_level?: string
          estimated_hours?: number
          id?: string
          order_index?: number
          task_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_person_id?: string | null
          completed?: boolean
          created_at?: string
          diy_level?: string
          estimated_hours?: number
          id?: string
          order_index?: number
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
          ordered: boolean
          priority: string
          project_run_id: string | null
          status: string
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
          ordered?: boolean
          priority?: string
          project_run_id?: string | null
          status?: string
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
          ordered?: boolean
          priority?: string
          project_run_id?: string | null
          status?: string
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
          address: string | null
          build_year: string | null
          city: string | null
          created_at: string
          home_ownership: string | null
          home_type: string | null
          id: string
          is_primary: boolean | null
          name: string
          notes: string | null
          photos: string[] | null
          purchase_date: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          build_year?: string | null
          city?: string | null
          created_at?: string
          home_ownership?: string | null
          home_type?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          notes?: string | null
          photos?: string[] | null
          purchase_date?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          build_year?: string | null
          city?: string | null
          created_at?: string
          home_ownership?: string | null
          home_type?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          photos?: string[] | null
          purchase_date?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_revisions: {
        Row: {
          affected_users: number | null
          applied_at: string
          change_type: string
          created_at: string
          created_by: string | null
          data_source: string
          id: string
          impact_score: number
          original_content: string
          project_type: string
          revised_content: string
          source_id: string | null
          step_id: string
          summary: string
        }
        Insert: {
          affected_users?: number | null
          applied_at?: string
          change_type: string
          created_at?: string
          created_by?: string | null
          data_source: string
          id?: string
          impact_score: number
          original_content: string
          project_type: string
          revised_content: string
          source_id?: string | null
          step_id: string
          summary: string
        }
        Update: {
          affected_users?: number | null
          applied_at?: string
          change_type?: string
          created_at?: string
          created_by?: string | null
          data_source?: string
          id?: string
          impact_score?: number
          original_content?: string
          project_type?: string
          revised_content?: string
          source_id?: string | null
          step_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_revisions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          last_scrape_at: string
          name: string
          source_type: string
          status: string
          trust_score: number
          updated_at: string
          url: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_scrape_at?: string
          name: string
          source_type: string
          status?: string
          trust_score?: number
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_scrape_at?: string
          name?: string
          source_type?: string
          status?: string
          trust_score?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      knowledge_updates: {
        Row: {
          content: string
          created_at: string
          discovered_at: string
          id: string
          project_types: string[]
          relevance_score: number
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          discovered_at?: string
          id?: string
          project_types: string[]
          relevance_score: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          discovered_at?: string
          id?: string
          project_types?: string[]
          relevance_score?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          notes: string | null
          photo_url: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
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
          email_enabled: boolean
          id: string
          notify_due_date: boolean
          notify_monthly: boolean
          notify_weekly: boolean
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
          notify_due_date?: boolean
          notify_monthly?: boolean
          notify_weekly?: boolean
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
          notify_due_date?: boolean
          notify_monthly?: boolean
          notify_weekly?: boolean
          phone_number?: string | null
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          frequency_days: number
          id: string
          instructions: string | null
          photo_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency_days: number
          id?: string
          instructions?: string | null
          photo_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency_days?: number
          id?: string
          instructions?: string | null
          photo_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          alternates: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          item: string
          photo_url: string | null
          unit_size: string | null
          updated_at: string
        }
        Insert: {
          alternates?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item: string
          photo_url?: string | null
          unit_size?: string | null
          updated_at?: string
        }
        Update: {
          alternates?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item?: string
          photo_url?: string | null
          unit_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      optimization_insights: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          frequency: number
          id: string
          impact: string
          projects_affected: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          frequency: number
          id?: string
          impact: string
          projects_affected: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          frequency?: number
          id?: string
          impact?: string
          projects_affected?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pfmea_action_items: {
        Row: {
          completion_notes: string | null
          created_at: string
          created_by: string | null
          failure_mode_id: string
          id: string
          recommended_action: string
          responsible_person: string | null
          status: string | null
          target_completion_date: string | null
          updated_at: string
        }
        Insert: {
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          failure_mode_id: string
          id?: string
          recommended_action: string
          responsible_person?: string | null
          status?: string | null
          target_completion_date?: string | null
          updated_at?: string
        }
        Update: {
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          failure_mode_id?: string
          id?: string
          recommended_action?: string
          responsible_person?: string | null
          status?: string | null
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
          control_description: string
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
          requirement_id: string
          severity_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          failure_mode: string
          id?: string
          requirement_id: string
          severity_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          failure_mode?: string
          id?: string
          requirement_id?: string
          severity_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pfmea_failure_modes_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "pfmea_requirements"
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
          cause_description: string
          created_at?: string
          failure_mode_id: string
          id?: string
          occurrence_score: number
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
          effect_description: string
          failure_mode_id: string
          id?: string
          severity_score: number
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
      pfmea_projects: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          project_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pfmea_requirements: {
        Row: {
          created_at: string
          id: string
          output_reference: Json | null
          pfmea_project_id: string
          process_step_id: string
          requirement_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          output_reference?: Json | null
          pfmea_project_id: string
          process_step_id: string
          requirement_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          output_reference?: Json | null
          pfmea_project_id?: string
          process_step_id?: string
          requirement_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pfmea_requirements_pfmea_project_id_fkey"
            columns: ["pfmea_project_id"]
            isOneToOne: false
            referencedRelation: "pfmea_projects"
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
        Relationships: [
          {
            foreignKeyName: "pricing_data_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "tool_models"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agreement_signed_at: string | null
          avatar_url: string | null
          avoid_projects: string[] | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          home_build_year: string | null
          home_id: string | null
          home_ownership: string | null
          home_state: string | null
          id: string
          nickname: string | null
          owned_materials: Json | null
          owned_tools: Json | null
          physical_capability: string | null
          preferred_learning_methods: string[] | null
          signed_agreement: Json | null
          skill_level: string | null
          space_type: string | null
          survey_completed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agreement_signed_at?: string | null
          avatar_url?: string | null
          avoid_projects?: string[] | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          home_build_year?: string | null
          home_id?: string | null
          home_ownership?: string | null
          home_state?: string | null
          id?: string
          nickname?: string | null
          owned_materials?: Json | null
          owned_tools?: Json | null
          physical_capability?: string | null
          preferred_learning_methods?: string[] | null
          signed_agreement?: Json | null
          skill_level?: string | null
          space_type?: string | null
          survey_completed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agreement_signed_at?: string | null
          avatar_url?: string | null
          avoid_projects?: string[] | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          home_build_year?: string | null
          home_id?: string | null
          home_ownership?: string | null
          home_state?: string | null
          id?: string
          nickname?: string | null
          owned_materials?: Json | null
          owned_tools?: Json | null
          physical_capability?: string | null
          preferred_learning_methods?: string[] | null
          signed_agreement?: Json | null
          skill_level?: string | null
          space_type?: string | null
          survey_completed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_home_id"
            columns: ["home_id"]
            isOneToOne: false
            referencedRelation: "homes"
            referencedColumns: ["id"]
          },
        ]
      }
      project_certificates: {
        Row: {
          certificate_data: Json
          generated_at: string
          id: string
          project_run_id: string
          shared_via_email: boolean | null
          user_id: string
        }
        Insert: {
          certificate_data: Json
          generated_at?: string
          id?: string
          project_run_id: string
          shared_via_email?: boolean | null
          user_id: string
        }
        Update: {
          certificate_data?: Json
          generated_at?: string
          id?: string
          project_run_id?: string
          shared_via_email?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_certificates_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_owner_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          invited_email: string
          invited_user_id: string | null
          status: string
          terms_version: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          invitation_token: string
          invited_by: string
          invited_email: string
          invited_user_id?: string | null
          status?: string
          terms_version?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          invited_email?: string
          invited_user_id?: string | null
          status?: string
          terms_version?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_owner_terms_acceptances: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          invitation_id: string
          ip_address: unknown
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          invitation_id: string
          ip_address?: unknown
          terms_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          invitation_id?: string
          ip_address?: unknown
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_owner_terms_acceptances_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "project_owner_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_owners: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          user_id?: string
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
      project_plans: {
        Row: {
          contingency_percent: number
          created_at: string
          description: string | null
          id: string
          line_items: Json
          name: string
          notes: string | null
          sales_tax_percent: number
          state: string | null
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contingency_percent?: number
          created_at?: string
          description?: string | null
          id?: string
          line_items?: Json
          name: string
          notes?: string | null
          sales_tax_percent?: number
          state?: string | null
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contingency_percent?: number
          created_at?: string
          description?: string | null
          id?: string
          line_items?: Json
          name?: string
          notes?: string | null
          sales_tax_percent?: number
          state?: string | null
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_plans_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "home_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_run_spaces: {
        Row: {
          created_at: string
          home_space_id: string | null
          id: string
          is_from_home: boolean
          project_run_id: string
          scale_unit: string | null
          scale_value: number | null
          space_name: string
          space_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          home_space_id?: string | null
          id?: string
          is_from_home?: boolean
          project_run_id: string
          scale_unit?: string | null
          scale_value?: number | null
          space_name: string
          space_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          home_space_id?: string | null
          id?: string
          is_from_home?: boolean
          project_run_id?: string
          scale_unit?: string | null
          scale_value?: number | null
          space_name?: string
          space_type?: string
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
        ]
      }
      project_run_steps: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          custom_materials: Json | null
          custom_tools: Json | null
          id: string
          is_completed: boolean | null
          project_run_id: string
          started_at: string | null
          template_step_id: string
          updated_at: string | null
          user_notes: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          custom_materials?: Json | null
          custom_tools?: Json | null
          id?: string
          is_completed?: boolean | null
          project_run_id: string
          started_at?: string | null
          template_step_id: string
          updated_at?: string | null
          user_notes?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          custom_materials?: Json | null
          custom_tools?: Json | null
          id?: string
          is_completed?: boolean | null
          project_run_id?: string
          started_at?: string | null
          template_step_id?: string
          updated_at?: string | null
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_run_steps_project_run_id_fkey"
            columns: ["project_run_id"]
            isOneToOne: false
            referencedRelation: "project_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_run_steps_template_step_id_fkey"
            columns: ["template_step_id"]
            isOneToOne: false
            referencedRelation: "template_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      project_runs: {
        Row: {
          accountability_partner: string | null
          budget_data: Json | null
          category: string | null
          completed_steps: Json
          created_at: string
          current_operation_id: string | null
          current_phase_id: string | null
          current_step_id: string | null
          custom_project_name: string | null
          customization_decisions: Json | null
          description: string | null
          difficulty: string | null
          diy_length_challenges: string | null
          effort_level: string | null
          end_date: string | null
          estimated_time: string | null
          home_id: string | null
          id: string
          instruction_level_preference: string | null
          is_manual_entry: boolean
          issue_reports: Json | null
          name: string
          phase_ratings: Json | null
          phases: Json
          plan_end_date: string
          progress: number
          project_leader: string | null
          project_photos: Json | null
          schedule_events: Json | null
          shopping_checklist_data: Json | null
          skill_level: string | null
          start_date: string
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accountability_partner?: string | null
          budget_data?: Json | null
          category?: string | null
          completed_steps?: Json
          created_at?: string
          current_operation_id?: string | null
          current_phase_id?: string | null
          current_step_id?: string | null
          custom_project_name?: string | null
          customization_decisions?: Json | null
          description?: string | null
          difficulty?: string | null
          diy_length_challenges?: string | null
          effort_level?: string | null
          end_date?: string | null
          estimated_time?: string | null
          home_id?: string | null
          id?: string
          instruction_level_preference?: string | null
          is_manual_entry?: boolean
          issue_reports?: Json | null
          name: string
          phase_ratings?: Json | null
          phases?: Json
          plan_end_date?: string
          progress?: number
          project_leader?: string | null
          project_photos?: Json | null
          schedule_events?: Json | null
          shopping_checklist_data?: Json | null
          skill_level?: string | null
          start_date?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accountability_partner?: string | null
          budget_data?: Json | null
          category?: string | null
          completed_steps?: Json
          created_at?: string
          current_operation_id?: string | null
          current_phase_id?: string | null
          current_step_id?: string | null
          custom_project_name?: string | null
          customization_decisions?: Json | null
          description?: string | null
          difficulty?: string | null
          diy_length_challenges?: string | null
          effort_level?: string | null
          end_date?: string | null
          estimated_time?: string | null
          home_id?: string | null
          id?: string
          instruction_level_preference?: string | null
          is_manual_entry?: boolean
          issue_reports?: Json | null
          name?: string
          phase_ratings?: Json | null
          phases?: Json
          plan_end_date?: string
          progress?: number
          project_leader?: string | null
          project_photos?: Json | null
          schedule_events?: Json | null
          shopping_checklist_data?: Json | null
          skill_level?: string | null
          start_date?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_runs_home_id"
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
      projects: {
        Row: {
          archived_at: string | null
          beta_released_at: string | null
          category: string[] | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          created_from_revision: number | null
          description: string | null
          difficulty: string | null
          diy_length_challenges: string | null
          effort_level: string | null
          end_date: string | null
          estimated_time: string | null
          estimated_time_per_unit: number | null
          id: string
          image: string | null
          images: string[] | null
          is_current_version: boolean | null
          is_standard_template: boolean | null
          name: string
          owner_id: string | null
          parent_project_id: string | null
          phase_revision_alerts: Json | null
          phases: Json
          plan_end_date: string
          publish_status: string
          published_at: string | null
          release_notes: string | null
          revision_notes: string | null
          revision_number: number | null
          scaling_unit: string | null
          skill_level: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          beta_released_at?: string | null
          category?: string[] | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          created_from_revision?: number | null
          description?: string | null
          difficulty?: string | null
          diy_length_challenges?: string | null
          effort_level?: string | null
          end_date?: string | null
          estimated_time?: string | null
          estimated_time_per_unit?: number | null
          id?: string
          image?: string | null
          images?: string[] | null
          is_current_version?: boolean | null
          is_standard_template?: boolean | null
          name: string
          owner_id?: string | null
          parent_project_id?: string | null
          phase_revision_alerts?: Json | null
          phases?: Json
          plan_end_date?: string
          publish_status?: string
          published_at?: string | null
          release_notes?: string | null
          revision_notes?: string | null
          revision_number?: number | null
          scaling_unit?: string | null
          skill_level?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          beta_released_at?: string | null
          category?: string[] | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          created_from_revision?: number | null
          description?: string | null
          difficulty?: string | null
          diy_length_challenges?: string | null
          effort_level?: string | null
          end_date?: string | null
          estimated_time?: string | null
          estimated_time_per_unit?: number | null
          id?: string
          image?: string | null
          images?: string[] | null
          is_current_version?: boolean | null
          is_standard_template?: boolean | null
          name?: string
          owner_id?: string | null
          parent_project_id?: string | null
          phase_revision_alerts?: Json | null
          phases?: Json
          plan_end_date?: string
          publish_status?: string
          published_at?: string | null
          release_notes?: string | null
          revision_notes?: string | null
          revision_number?: number | null
          scaling_unit?: string | null
          skill_level?: string | null
          start_date?: string
          status?: string
          updated_at?: string
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
          action: string
          created_at: string
          id: string
          ip_address: unknown
          role: string
          target_user_email: string | null
          target_user_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          role: string
          target_user_email?: string | null
          target_user_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          role?: string
          target_user_email?: string | null
          target_user_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scaled_step_progress: {
        Row: {
          created_at: string
          id: string
          progress_percentage: number
          project_run_id: string
          space_id: string
          step_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          progress_percentage?: number
          project_run_id: string
          space_id: string
          step_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          progress_percentage?: number
          project_run_id?: string
          space_id?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scaled_step_progress_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "project_run_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events_log: {
        Row: {
          additional_data: Json | null
          created_at: string | null
          description: string
          event_type: string
          id: string
          ip_address: unknown
          severity: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          additional_data?: Json | null
          created_at?: string | null
          description: string
          event_type: string
          id?: string
          ip_address?: unknown
          severity: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          additional_data?: Json | null
          created_at?: string | null
          description?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          severity?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sensitive_data_access_log: {
        Row: {
          access_type: string
          accessed_table: string
          accessed_user_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          accessed_table: string
          accessed_user_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          accessed_table?: string
          accessed_user_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      standard_phases: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          is_locked: boolean
          name: string
          position_rule: string
          position_value: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order: number
          id?: string
          is_locked?: boolean
          name: string
          position_rule?: string
          position_value?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_locked?: boolean
          name?: string
          position_rule?: string
          position_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      step_instructions: {
        Row: {
          content: Json
          created_at: string
          id: string
          instruction_level: string
          template_step_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          instruction_level: string
          template_step_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          instruction_level?: string
          template_step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_instructions_template_step_id_fkey"
            columns: ["template_step_id"]
            isOneToOne: false
            referencedRelation: "template_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      template_operations: {
        Row: {
          alternate_group: string | null
          created_at: string | null
          custom_phase_description: string | null
          custom_phase_display_order: number | null
          custom_phase_name: string | null
          dependent_on: string | null
          description: string | null
          display_order: number
          flow_type: string | null
          id: string
          is_custom_phase: boolean | null
          name: string
          project_id: string
          standard_phase_id: string | null
          updated_at: string | null
          user_prompt: string | null
        }
        Insert: {
          alternate_group?: string | null
          created_at?: string | null
          custom_phase_description?: string | null
          custom_phase_display_order?: number | null
          custom_phase_name?: string | null
          dependent_on?: string | null
          description?: string | null
          display_order?: number
          flow_type?: string | null
          id?: string
          is_custom_phase?: boolean | null
          name: string
          project_id: string
          standard_phase_id?: string | null
          updated_at?: string | null
          user_prompt?: string | null
        }
        Update: {
          alternate_group?: string | null
          created_at?: string | null
          custom_phase_description?: string | null
          custom_phase_display_order?: number | null
          custom_phase_name?: string | null
          dependent_on?: string | null
          description?: string | null
          display_order?: number
          flow_type?: string | null
          id?: string
          is_custom_phase?: boolean | null
          name?: string
          project_id?: string
          standard_phase_id?: string | null
          updated_at?: string | null
          user_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_operations_dependent_on_fkey"
            columns: ["dependent_on"]
            isOneToOne: false
            referencedRelation: "template_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_operations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_operations_standard_phase_id_fkey"
            columns: ["standard_phase_id"]
            isOneToOne: false
            referencedRelation: "standard_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      template_steps: {
        Row: {
          apps: Json | null
          content_sections: Json | null
          created_at: string | null
          description: string | null
          display_order: number
          estimated_time_minutes: number | null
          flow_type: string | null
          id: string
          materials: Json | null
          operation_id: string
          outputs: Json | null
          step_number: number
          step_title: string
          step_type: string | null
          tools: Json | null
          updated_at: string | null
        }
        Insert: {
          apps?: Json | null
          content_sections?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          estimated_time_minutes?: number | null
          flow_type?: string | null
          id?: string
          materials?: Json | null
          operation_id: string
          outputs?: Json | null
          step_number: number
          step_title: string
          step_type?: string | null
          tools?: Json | null
          updated_at?: string | null
        }
        Update: {
          apps?: Json | null
          content_sections?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          estimated_time_minutes?: number | null
          flow_type?: string | null
          id?: string
          materials?: Json | null
          operation_id?: string
          outputs?: Json | null
          step_number?: number
          step_title?: string
          step_type?: string | null
          tools?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_steps_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "template_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_models: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          manufacturer: string | null
          model_name: string
          model_number: string | null
          upc_code: string | null
          updated_at: string
          variation_instance_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          manufacturer?: string | null
          model_name: string
          model_number?: string | null
          upc_code?: string | null
          updated_at?: string
          variation_instance_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          manufacturer?: string | null
          model_name?: string
          model_number?: string | null
          upc_code?: string | null
          updated_at?: string
          variation_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_models_variation_instance_id_fkey"
            columns: ["variation_instance_id"]
            isOneToOne: false
            referencedRelation: "variation_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          alternates: string | null
          created_at: string
          created_by: string | null
          description: string | null
          example_models: string | null
          id: string
          item: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          alternates?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          example_models?: string | null
          id?: string
          item: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          alternates?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          example_models?: string | null
          id?: string
          item?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          notification_sent: boolean | null
          progress: Json | null
          unlocked_at: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          achievement_id: string
          id?: string
          notification_sent?: boolean | null
          progress?: Json | null
          unlocked_at?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          achievement_id?: string
          id?: string
          notification_sent?: boolean | null
          progress?: Json | null
          unlocked_at?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_maintenance_tasks: {
        Row: {
          category: string
          created_at: string
          description: string | null
          frequency_days: number
          home_id: string
          id: string
          is_active: boolean
          is_custom: boolean
          last_completed_at: string | null
          next_due_date: string
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          frequency_days: number
          home_id: string
          id?: string
          is_active?: boolean
          is_custom?: boolean
          last_completed_at?: string | null
          next_due_date: string
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          frequency_days?: number
          home_id?: string
          id?: string
          is_active?: boolean
          is_custom?: boolean
          last_completed_at?: string | null
          next_due_date?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_maintenance_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "maintenance_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
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
          xp_amount: number
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
      variation_attribute_values: {
        Row: {
          attribute_id: string
          core_item_id: string | null
          created_at: string
          display_value: string
          id: string
          sort_order: number | null
          updated_at: string
          value: string
        }
        Insert: {
          attribute_id: string
          core_item_id?: string | null
          created_at?: string
          display_value: string
          id?: string
          sort_order?: number | null
          updated_at?: string
          value: string
        }
        Update: {
          attribute_id?: string
          core_item_id?: string | null
          created_at?: string
          display_value?: string
          id?: string
          sort_order?: number | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "variation_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "variation_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      variation_attributes: {
        Row: {
          attribute_type: string
          created_at: string
          display_name: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          attribute_type?: string
          created_at?: string
          display_name: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          attribute_type?: string
          created_at?: string
          display_name?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      variation_instances: {
        Row: {
          attributes: Json
          core_item_id: string
          created_at: string
          description: string | null
          estimated_rental_lifespan_days: number | null
          estimated_weight_lbs: number | null
          id: string
          item_type: string
          name: string
          photo_url: string | null
          sku: string | null
          updated_at: string
          warning_flags: string[] | null
          weight_lbs: number | null
        }
        Insert: {
          attributes?: Json
          core_item_id: string
          created_at?: string
          description?: string | null
          estimated_rental_lifespan_days?: number | null
          estimated_weight_lbs?: number | null
          id?: string
          item_type: string
          name: string
          photo_url?: string | null
          sku?: string | null
          updated_at?: string
          warning_flags?: string[] | null
          weight_lbs?: number | null
        }
        Update: {
          attributes?: Json
          core_item_id?: string
          created_at?: string
          description?: string | null
          estimated_rental_lifespan_days?: number | null
          estimated_weight_lbs?: number | null
          id?: string
          item_type?: string
          name?: string
          photo_url?: string | null
          sku?: string | null
          updated_at?: string
          warning_flags?: string[] | null
          weight_lbs?: number | null
        }
        Relationships: []
      }
      variation_warning_flags: {
        Row: {
          created_at: string
          id: string
          variation_instance_id: string
          warning_flag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          variation_instance_id: string
          warning_flag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          variation_instance_id?: string
          warning_flag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variation_warning_flags_variation_instance_id_fkey"
            columns: ["variation_instance_id"]
            isOneToOne: false
            referencedRelation: "variation_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variation_warning_flags_warning_flag_id_fkey"
            columns: ["warning_flag_id"]
            isOneToOne: false
            referencedRelation: "warning_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      warning_flags: {
        Row: {
          color_class: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon_class: string | null
          id: string
          is_predefined: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color_class?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_class?: string | null
          id?: string
          is_predefined?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color_class?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_class?: string | null
          id?: string
          is_predefined?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_optimizations: {
        Row: {
          affected_steps: string[]
          applied: boolean
          applied_date: string | null
          average_time_after: number | null
          average_time_before: number | null
          confidence: number
          created_at: string
          created_by: string | null
          description: string
          effort_reduction: number
          feedback_score: number | null
          id: string
          optimization_type: string
          project_types: string[]
          status: string
          time_savings: number
          title: string
          updated_at: string
          user_completions: number | null
        }
        Insert: {
          affected_steps: string[]
          applied?: boolean
          applied_date?: string | null
          average_time_after?: number | null
          average_time_before?: number | null
          confidence: number
          created_at?: string
          created_by?: string | null
          description: string
          effort_reduction?: number
          feedback_score?: number | null
          id?: string
          optimization_type: string
          project_types: string[]
          status?: string
          time_savings?: number
          title: string
          updated_at?: string
          user_completions?: number | null
        }
        Update: {
          affected_steps?: string[]
          applied?: boolean
          applied_date?: string | null
          average_time_after?: number | null
          average_time_before?: number | null
          confidence?: number
          created_at?: string
          created_by?: string | null
          description?: string
          effort_reduction?: number
          feedback_score?: number | null
          id?: string
          optimization_type?: string
          project_types?: string[]
          status?: string
          time_savings?: number
          title?: string
          updated_at?: string
          user_completions?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_admin_by_email: { Args: { user_email: string }; Returns: string }
      apply_standard_phase_positioning: {
        Args: { p_custom_phases?: Json; p_project_id: string }
        Returns: Json
      }
      calculate_pfmea_rpn: {
        Args: { failure_mode_uuid: string }
        Returns: number
      }
      check_phase_revision_updates: {
        Args: never
        Returns: {
          alerts: Json
          project_id: string
          project_name: string
        }[]
      }
      check_rate_limit: {
        Args: {
          identifier: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_old_sessions: { Args: never; Returns: number }
      cleanup_security_logs: { Args: never; Returns: number }
      create_project_revision: {
        Args: { revision_notes_text?: string; source_project_id: string }
        Returns: string
      }
      create_project_run_snapshot: {
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
      create_project_with_standard_foundation:
        | {
            Args: {
              p_description?: string
              p_project_name: string
              p_project_type?: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_category?: string
              p_description?: string
              p_difficulty?: string
              p_diy_length_challenges?: string
              p_effort_level?: string
              p_estimated_time?: string
              p_image?: string
              p_project_name: string
              p_scaling_unit?: string
              p_skill_level?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_categories?: string[]
              p_description?: string
              p_difficulty?: string
              p_diy_length_challenges?: string
              p_effort_level?: string
              p_estimated_time?: string
              p_image?: string
              p_project_name: string
              p_scaling_unit?: string
              p_skill_level?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_category?: string
              p_description?: string
              p_difficulty?: string
              p_effort_level?: string
              p_estimated_time?: string
              p_image?: string
              p_project_name: string
            }
            Returns: string
          }
      delete_user_data: { Args: { user_uuid: string }; Returns: string }
      detect_suspicious_activity: {
        Args: never
        Returns: {
          risk_score: number
          suspicious_events: Json
          user_email: string
          user_id: string
        }[]
      }
      enhanced_rate_limit_check: {
        Args: {
          identifier: string
          max_attempts?: number
          operation_type: string
          window_minutes?: number
        }
        Returns: boolean
      }
      expire_old_invitations: { Args: never; Returns: undefined }
      export_user_data: { Args: { user_uuid: string }; Returns: Json }
      get_average_market_price: {
        Args: { variation_id: string }
        Returns: number
      }
      get_failed_login_summary: {
        Args: { days_back?: number }
        Returns: {
          attempt_count: number
          date: string
          top_attempted_domains: string[]
          unique_emails: number
          unique_ips: number
        }[]
      }
      get_masked_home_for_admin:
        | {
            Args: { home_user_id: string }
            Returns: {
              address_masked: string
              build_year: string
              city: string
              created_at: string
              home_type: string
              id: string
              name: string
              state: string
              user_id: string
            }[]
          }
        | {
            Args: { access_reason?: string; home_user_id: string }
            Returns: {
              address_masked: string
              build_year: string
              city: string
              created_at: string
              home_type: string
              id: string
              name: string
              state: string
              user_id: string
            }[]
          }
      get_masked_profile_for_admin:
        | {
            Args: { profile_user_id: string }
            Returns: {
              created_at: string
              display_name: string
              email_masked: string
              full_name_masked: string
              home_ownership: string
              home_state: string
              id: string
              skill_level: string
              user_id: string
            }[]
          }
        | {
            Args: { access_reason?: string; profile_user_id: string }
            Returns: {
              created_at: string
              display_name: string
              email_masked: string
              full_name_masked: string
              home_ownership: string
              home_state: string
              id: string
              skill_level: string
              user_id: string
            }[]
          }
      get_security_headers: { Args: never; Returns: Json }
      get_security_metrics: {
        Args: { timeframe_hours?: number }
        Returns: {
          active_sessions_count: number
          failed_logins_count: number
          role_changes_count: number
          unique_ips_count: number
        }[]
      }
      get_standard_project_template: {
        Args: never
        Returns: {
          phases: Json
          project_id: string
          project_name: string
        }[]
      }
      get_user_notification_settings: {
        Args: { user_uuid: string }
        Returns: {
          created_at: string
          email_address: string
          email_enabled: boolean
          id: string
          notify_due_date: boolean
          notify_monthly: boolean
          notify_weekly: boolean
          phone_number: string
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }[]
      }
      get_user_profile_safe: {
        Args: { user_uuid: string }
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          user_id: string
        }[]
      }
      get_user_role: { Args: { user_id: string }; Returns: string }
      has_project_owner_role: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_beta_mode_active: { Args: never; Returns: boolean }
      is_project_owner: {
        Args: { project_id_param: string; user_id_param: string }
        Returns: boolean
      }
      log_comprehensive_security_event: {
        Args: {
          p_additional_data?: Json
          p_description: string
          p_event_type: string
          p_ip_address?: string
          p_severity: string
          p_user_agent?: string
          p_user_email?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      log_failed_login: {
        Args: {
          ip_addr?: string
          user_agent_string?: string
          user_email: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          event_description: string
          event_type: string
          ip_addr?: string
          user_email?: string
        }
        Returns: undefined
      }
      log_sensitive_data_access: {
        Args: {
          access_type?: string
          accessed_table: string
          accessed_user_id: string
        }
        Returns: undefined
      }
      rebuild_phases_json_from_templates: {
        Args: { p_project_id: string }
        Returns: Json
      }
      rebuild_project_from_standard: {
        Args: { project_id_to_rebuild: string }
        Returns: undefined
      }
      refresh_project_run_from_template: {
        Args: { p_run_id: string }
        Returns: Json
      }
      request_emergency_data_access: {
        Args: {
          emergency_reason: string
          supervisor_email: string
          target_user_id: string
        }
        Returns: string
      }
      request_sensitive_data_access: {
        Args: {
          justification: string
          requested_fields?: string[]
          target_table: string
          target_user_id: string
        }
        Returns: string
      }
      sanitize_input: { Args: { input_text: string }; Returns: string }
      start_admin_session: { Args: never; Returns: string }
      sync_custom_phases_to_tables: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      sync_phases_to_templates: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      test_custom_phase_revision_preservation: {
        Args: never
        Returns: {
          details: string
          passed: boolean
          test_name: string
        }[]
      }
      update_phase_revision_alert: {
        Args: { p_action: string; p_phase_id: string; p_project_id: string }
        Returns: undefined
      }
      upsert_notification_settings: {
        Args: {
          email_address: string
          email_enabled: boolean
          notify_due_date: boolean
          notify_monthly: boolean
          notify_weekly: boolean
          phone_number: string
          sms_enabled: boolean
          user_uuid: string
        }
        Returns: string
      }
      validate_admin_action: { Args: { action_type: string }; Returns: boolean }
      validate_admin_data_access: {
        Args: { access_reason: string; target_table: string }
        Returns: boolean
      }
      validate_admin_security_access: {
        Args: { action_description: string }
        Returns: boolean
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
