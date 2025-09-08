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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      failed_login_attempts: {
        Row: {
          attempt_time: string
          email: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string
          email: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string
          email?: string
          id?: string
          ip_address?: unknown | null
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
        Relationships: []
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
      profiles: {
        Row: {
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
          skill_level: string | null
          space_type: string | null
          survey_completed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
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
          skill_level?: string | null
          space_type?: string | null
          survey_completed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
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
      project_runs: {
        Row: {
          accountability_partner: string | null
          category: string | null
          completed_steps: Json
          created_at: string
          current_operation_id: string | null
          current_phase_id: string | null
          current_step_id: string | null
          custom_project_name: string | null
          description: string | null
          difficulty: string | null
          end_date: string | null
          estimated_time: string | null
          home_id: string | null
          id: string
          issue_reports: Json | null
          name: string
          phase_ratings: Json | null
          phases: Json
          plan_end_date: string
          progress: number
          project_leader: string | null
          project_photos: Json | null
          start_date: string
          status: string
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accountability_partner?: string | null
          category?: string | null
          completed_steps?: Json
          created_at?: string
          current_operation_id?: string | null
          current_phase_id?: string | null
          current_step_id?: string | null
          custom_project_name?: string | null
          description?: string | null
          difficulty?: string | null
          end_date?: string | null
          estimated_time?: string | null
          home_id?: string | null
          id?: string
          issue_reports?: Json | null
          name: string
          phase_ratings?: Json | null
          phases?: Json
          plan_end_date?: string
          progress?: number
          project_leader?: string | null
          project_photos?: Json | null
          start_date?: string
          status?: string
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accountability_partner?: string | null
          category?: string | null
          completed_steps?: Json
          created_at?: string
          current_operation_id?: string | null
          current_phase_id?: string | null
          current_step_id?: string | null
          custom_project_name?: string | null
          description?: string | null
          difficulty?: string | null
          end_date?: string | null
          estimated_time?: string | null
          home_id?: string | null
          id?: string
          issue_reports?: Json | null
          name?: string
          phase_ratings?: Json | null
          phases?: Json
          plan_end_date?: string
          progress?: number
          project_leader?: string | null
          project_photos?: Json | null
          start_date?: string
          status?: string
          template_id?: string
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
          category: string | null
          created_at: string
          created_by: string | null
          created_from_revision: number | null
          description: string | null
          difficulty: string | null
          effort_level: string | null
          end_date: string | null
          estimated_time: string | null
          estimated_time_per_unit: number | null
          id: string
          image: string | null
          name: string
          parent_project_id: string | null
          phases: Json
          plan_end_date: string
          publish_status: string
          revision_notes: string | null
          revision_number: number | null
          scaling_unit: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_from_revision?: number | null
          description?: string | null
          difficulty?: string | null
          effort_level?: string | null
          end_date?: string | null
          estimated_time?: string | null
          estimated_time_per_unit?: number | null
          id?: string
          image?: string | null
          name: string
          parent_project_id?: string | null
          phases?: Json
          plan_end_date?: string
          publish_status?: string
          revision_notes?: string | null
          revision_number?: number | null
          scaling_unit?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          created_from_revision?: number | null
          description?: string | null
          difficulty?: string | null
          effort_level?: string | null
          end_date?: string | null
          estimated_time?: string | null
          estimated_time_per_unit?: number | null
          id?: string
          image?: string | null
          name?: string
          parent_project_id?: string | null
          phases?: Json
          plan_end_date?: string
          publish_status?: string
          revision_notes?: string | null
          revision_number?: number | null
          scaling_unit?: string | null
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
          role?: string
          target_user_email?: string | null
          target_user_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
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
          ip_address: unknown | null
          is_active: boolean
          session_end: string | null
          session_start: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
          id: string
          item_type: string
          name: string
          photo_url: string | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          attributes?: Json
          core_item_id: string
          created_at?: string
          description?: string | null
          id?: string
          item_type: string
          name: string
          photo_url?: string | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          attributes?: Json
          core_item_id?: string
          created_at?: string
          description?: string | null
          id?: string
          item_type?: string
          name?: string
          photo_url?: string | null
          sku?: string | null
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
      add_admin_by_email: {
        Args: { user_email: string }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          identifier: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_old_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_security_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      delete_user_data: {
        Args: { user_uuid: string }
        Returns: string
      }
      export_user_data: {
        Args: { user_uuid: string }
        Returns: Json
      }
      get_security_headers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
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
      sanitize_input: {
        Args: { input_text: string }
        Returns: string
      }
      validate_admin_action: {
        Args: { action_type: string }
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
