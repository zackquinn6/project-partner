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
      profiles: {
        Row: {
          avatar_url: string | null
          avoid_projects: string[] | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          home_build_year: string | null
          home_ownership: string | null
          home_state: string | null
          id: string
          nickname: string | null
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
          home_ownership?: string | null
          home_state?: string | null
          id?: string
          nickname?: string | null
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
          home_ownership?: string | null
          home_state?: string | null
          id?: string
          nickname?: string | null
          owned_tools?: Json | null
          physical_capability?: string | null
          preferred_learning_methods?: string[] | null
          skill_level?: string | null
          space_type?: string | null
          survey_completed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          id: string
          issue_reports: Json | null
          name: string
          phase_ratings: Json | null
          phases: Json
          plan_end_date: string
          progress: number
          project_leader: string | null
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
          id?: string
          issue_reports?: Json | null
          name: string
          phase_ratings?: Json | null
          phases?: Json
          plan_end_date?: string
          progress?: number
          project_leader?: string | null
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
          id?: string
          issue_reports?: Json | null
          name?: string
          phase_ratings?: Json | null
          phases?: Json
          plan_end_date?: string
          progress?: number
          project_leader?: string | null
          start_date?: string
          status?: string
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          description: string | null
          difficulty: string | null
          effort_level: string | null
          end_date: string | null
          estimated_time: string | null
          estimated_time_per_unit: number | null
          id: string
          image: string | null
          name: string
          phases: Json
          plan_end_date: string
          publish_status: string
          scaling_unit: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          effort_level?: string | null
          end_date?: string | null
          estimated_time?: string | null
          estimated_time_per_unit?: number | null
          id?: string
          image?: string | null
          name: string
          phases?: Json
          plan_end_date?: string
          publish_status?: string
          scaling_unit?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          effort_level?: string | null
          end_date?: string | null
          estimated_time?: string | null
          estimated_time_per_unit?: number | null
          id?: string
          image?: string | null
          name?: string
          phases?: Json
          plan_end_date?: string
          publish_status?: string
          scaling_unit?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_admin_by_email: {
        Args: { user_email: string }
        Returns: string
      }
      cleanup_old_sessions: {
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
