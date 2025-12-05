-- =====================================================
-- CRITICAL PROJECT SCHEMA REBUILD
-- Core tables needed for app to function
-- Date: 2025-12-05
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USER & AUTH TABLES
-- =====================================================

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'non_member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Trial tracking
CREATE TABLE IF NOT EXISTS public.trial_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  trial_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_end_date TIMESTAMPTZ NOT NULL,
  trial_extended_by INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe subscriptions
CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  price_id TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coupon codes
CREATE TABLE IF NOT EXISTS public.coupon_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  days_to_add INTEGER NOT NULL,
  max_redemptions INTEGER,
  times_redeemed INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Coupon redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  coupon_id UUID NOT NULL REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  days_added INTEGER NOT NULL
);

-- =====================================================
-- HOME & PROPERTY TABLES
-- =====================================================

-- Homes
CREATE TABLE IF NOT EXISTS public.homes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  home_type TEXT,
  build_year TEXT,
  home_ownership TEXT,
  purchase_date TEXT,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Home details
CREATE TABLE IF NOT EXISTS public.home_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID UNIQUE NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  square_footage INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  home_age INTEGER,
  zillow_url TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Home spaces
CREATE TABLE IF NOT EXISTS public.home_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  space_name TEXT NOT NULL,
  space_type TEXT DEFAULT 'room',
  square_footage INTEGER,
  notes TEXT,
  floor_plan_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PROJECT TEMPLATE TABLES
-- =====================================================

-- Projects (Templates)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  difficulty_level TEXT DEFAULT 'intermediate',
  estimated_time TEXT,
  estimated_cost TEXT,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'shared')),
  is_template BOOLEAN DEFAULT false,
  is_standard BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'other',
  phases JSONB DEFAULT '[]'::jsonb,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project phases (relational storage)
CREATE TABLE IF NOT EXISTS public.project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 999,
  position_rule TEXT DEFAULT 'nth' CHECK (position_rule IN ('first', 'nth', 'last', 'last_minus_n')),
  position_value INTEGER,
  is_standard BOOLEAN DEFAULT false,
  is_linked BOOLEAN DEFAULT false,
  source_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  source_project_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phase operations
CREATE TABLE IF NOT EXISTS public.phase_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
  operation_name TEXT NOT NULL,
  operation_description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  estimated_time TEXT,
  flow_type TEXT DEFAULT 'prime',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Operation steps
CREATE TABLE IF NOT EXISTS public.operation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.phase_operations(id) ON DELETE CASCADE,
  step_title TEXT NOT NULL,
  description TEXT,
  content_type TEXT DEFAULT 'text',
  content TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  materials JSONB DEFAULT '[]'::jsonb,
  tools JSONB DEFAULT '[]'::jsonb,
  outputs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PROJECT RUN TABLES (Active Projects)
-- =====================================================

-- Project runs
CREATE TABLE IF NOT EXISTS public.project_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  home_id UUID REFERENCES public.homes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  plan_end_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  progress NUMERIC(5,2) DEFAULT 0,
  phases JSONB DEFAULT '[]'::jsonb,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  progress_reporting_style TEXT DEFAULT 'linear',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project run spaces
CREATE TABLE IF NOT EXISTS public.project_run_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id UUID NOT NULL REFERENCES public.project_runs(id) ON DELETE CASCADE,
  space_name TEXT NOT NULL,
  space_type TEXT DEFAULT 'room',
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project run photos
CREATE TABLE IF NOT EXISTS public.project_run_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id UUID NOT NULL REFERENCES public.project_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type TEXT DEFAULT 'progress',
  phase_name TEXT,
  operation_name TEXT,
  step_title TEXT,
  space_id UUID,
  caption TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- USER CONTRACTORS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT,
  trade TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  license_number TEXT,
  insurance_verified BOOLEAN DEFAULT false,
  rating NUMERIC(2,1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contractor phase assignments
CREATE TABLE IF NOT EXISTS public.contractor_phase_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id UUID NOT NULL REFERENCES public.project_runs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.user_contractors(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  phase_id UUID,
  notes TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ACHIEVEMENTS
-- =====================================================

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

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  project_run_id UUID REFERENCES public.project_runs(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id, project_run_id)
);

-- =====================================================
-- FEEDBACK & FEATURE REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  actioned_by UUID,
  actioned_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feature_roadmap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'feature',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'planned',
  votes INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  target_date TEXT,
  completion_date TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'feature',
  priority_request TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'submitted',
  votes INTEGER DEFAULT 0,
  submitted_by UUID,
  roadmap_item_id UUID REFERENCES public.feature_roadmap(id) ON DELETE SET NULL,
  admin_response TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ENABLE RLS (Row Level Security)
-- =====================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_run_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_run_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_phase_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_homes_user_id ON public.homes(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON public.projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_is_template ON public.projects(is_template);
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON public.project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_phase_operations_phase_id ON public.phase_operations(phase_id);
CREATE INDEX IF NOT EXISTS idx_operation_steps_operation_id ON public.operation_steps(operation_id);
CREATE INDEX IF NOT EXISTS idx_project_runs_user_id ON public.project_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_project_runs_template_id ON public.project_runs(template_id);
CREATE INDEX IF NOT EXISTS idx_project_runs_home_id ON public.project_runs(home_id);
CREATE INDEX IF NOT EXISTS idx_project_run_photos_project_run_id ON public.project_run_photos(project_run_id);
CREATE INDEX IF NOT EXISTS idx_user_contractors_user_id ON public.user_contractors(user_id);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

-- Insert a marker to confirm migration ran
DO $$
BEGIN
  RAISE NOTICE 'Core schema rebuild completed successfully';
END $$;

