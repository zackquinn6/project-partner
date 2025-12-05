-- =====================================================
-- EMERGENCY SCHEMA REBUILD
-- Generated from types.ts after accidental db reset
-- Date: 2025-12-05
-- =====================================================
--
-- This migration rebuilds the complete database schema
-- from the TypeScript types file.
--
-- CRITICAL: This recreates the schema but NOT the data.
-- Data was lost due to accidental `supabase db reset --linked`
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Achievement system
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  criteria JSONB DEFAULT '{}'::jsonb,
  points INTEGER DEFAULT 0,
  base_xp INTEGER DEFAULT 0,
  scales_with_project_size BOOLEAN DEFAULT false,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.achievement_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  project_run_id UUID REFERENCES public.project_runs(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin tables
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  sensitive_data_accessed BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_sensitive_data_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  accessed_user_id UUID,
  accessed_table TEXT NOT NULL,
  access_type TEXT NOT NULL,
  data_fields_accessed TEXT[],
  justification TEXT,
  session_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Repair Analysis
CREATE TABLE IF NOT EXISTS public.ai_repair_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis_result JSONB DEFAULT '{}'::jsonb,
  issue_category TEXT,
  severity_level TEXT,
  root_cause_analysis TEXT,
  recommended_tools JSONB DEFAULT '[]'::jsonb,
  recommended_materials JSONB DEFAULT '[]'::jsonb,
  estimated_time TEXT,
  estimated_cost_range TEXT,
  difficulty_level TEXT,
  action_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- App settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: More tables will be added in continuation...
-- This file is intentionally split to manage size

