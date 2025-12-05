-- =====================================================
-- SUPPORTING TABLES REBUILD
-- Materials, Tools, Maintenance, Tasks, Security
-- Date: 2025-12-05
-- =====================================================

-- =====================================================
-- MATERIALS & TOOLS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT,
  unit_size TEXT,
  avg_cost_per_unit NUMERIC(10,2),
  supplier_link TEXT,
  photo_url TEXT,
  is_rental_available BOOLEAN DEFAULT false,
  alternates TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tool_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  website TEXT,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tool_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  parent_category_id UUID REFERENCES public.tool_categories(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tool_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.tool_brands(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.tool_categories(id) ON DELETE SET NULL,
  model_name TEXT NOT NULL,
  model_number TEXT,
  description TEXT,
  power_type TEXT,
  voltage TEXT,
  amperage TEXT,
  weight_lbs NUMERIC(6,2),
  dimensions TEXT,
  features TEXT[],
  image_url TEXT,
  manufacturer_url TEXT,
  is_rental_available BOOLEAN DEFAULT false,
  rental_price_per_day NUMERIC(8,2),
  average_price NUMERIC(10,2),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pricing_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.tool_models(id) ON DELETE CASCADE,
  retailer TEXT NOT NULL,
  price NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  availability_status TEXT,
  product_url TEXT,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'data',
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- MAINTENANCE & TASKS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.maintenance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  frequency_days INTEGER NOT NULL,
  instructions TEXT,
  photo_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  home_id UUID REFERENCES public.homes(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.maintenance_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  frequency_days INTEGER NOT NULL,
  last_completed TIMESTAMPTZ,
  next_due TIMESTAMPTZ NOT NULL,
  priority TEXT DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.user_maintenance_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  email_address TEXT,
  phone_number TEXT,
  notify_due_date BOOLEAN DEFAULT true,
  notify_weekly BOOLEAN DEFAULT false,
  notify_monthly BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Home task management
CREATE TABLE IF NOT EXISTS public.home_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  home_id UUID REFERENCES public.homes(id) ON DELETE SET NULL,
  project_run_id UUID REFERENCES public.project_runs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  diy_level TEXT,
  task_type TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  ordered BOOLEAN DEFAULT false,
  due_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.home_task_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  home_id UUID REFERENCES public.homes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  diy_level TEXT DEFAULT 'beginner',
  hourly_rate NUMERIC(8,2),
  available_hours NUMERIC(6,2) DEFAULT 0,
  consecutive_days INTEGER DEFAULT 0,
  available_days TEXT[] DEFAULT '{}',
  availability_mode TEXT,
  availability_start_date TEXT,
  availability_end_date TEXT,
  specific_dates TEXT[],
  not_available_dates TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.home_task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES public.home_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  diy_level TEXT DEFAULT 'beginner',
  estimated_hours NUMERIC(6,2) DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  assigned_person_id UUID REFERENCES public.home_task_people(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.home_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES public.home_tasks(id) ON DELETE CASCADE,
  subtask_id UUID REFERENCES public.home_task_subtasks(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.home_task_people(id) ON DELETE CASCADE,
  scheduled_date TEXT NOT NULL,
  scheduled_hours NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.home_task_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  home_id UUID,
  start_date TEXT NOT NULL,
  schedule_data JSONB DEFAULT '{}'::jsonb,
  unassigned JSONB,
  warnings JSONB,
  assignments_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DECISION TREES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.decision_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.decision_tree_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_tree_id UUID NOT NULL REFERENCES public.decision_trees(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  dependencies TEXT[],
  parallel_group TEXT,
  condition_rules JSONB,
  is_optional BOOLEAN DEFAULT false,
  fallback_operation_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.decision_tree_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.decision_tree_operations(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL,
  condition_data JSONB DEFAULT '{}'::jsonb,
  next_operation_id UUID REFERENCES public.decision_tree_operations(id) ON DELETE SET NULL,
  is_fallback BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.decision_tree_execution_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_run_id UUID NOT NULL,
  decision_tree_id UUID NOT NULL REFERENCES public.decision_trees(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  operation_id UUID NOT NULL REFERENCES public.decision_tree_operations(id) ON DELETE CASCADE,
  operation_name TEXT NOT NULL,
  execution_status TEXT DEFAULT 'pending',
  execution_timestamp TIMESTAMPTZ DEFAULT NOW(),
  chosen_path TEXT,
  decision_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SECURITY & ADMIN
-- =====================================================

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

-- Skipping failed_login_attempts - already created in 20250205000001

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

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_task_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_task_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tree_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tree_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_tree_execution_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sensitive_data_access ENABLE ROW LEVEL SECURITY;
-- failed_login_attempts RLS already enabled in 20250205000001
ALTER TABLE public.ai_repair_analyses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_maintenance_tasks_user_id ON public.user_maintenance_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_maintenance_tasks_home_id ON public.user_maintenance_tasks(home_id);
CREATE INDEX IF NOT EXISTS idx_home_tasks_user_id ON public.home_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_home_tasks_home_id ON public.home_tasks(home_id);
CREATE INDEX IF NOT EXISTS idx_decision_trees_project_id ON public.decision_trees(project_id);
CREATE INDEX IF NOT EXISTS idx_pricing_data_model_id ON public.pricing_data(model_id);
-- failed_login_attempts indexes created in 20250205000001

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Supporting tables rebuild completed successfully';
END $$;

