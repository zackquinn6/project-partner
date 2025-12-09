-- =====================================================
-- ADD MISSING COLUMNS TO project_runs TABLE
-- These columns store various project tracking data and metadata
-- =====================================================

-- Add JSONB columns for tracking data
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS issue_reports JSONB;

ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS time_tracking JSONB;

ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS project_photos JSONB;

ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS phase_ratings JSONB;

ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS schedule_events JSONB;

ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS shopping_checklist_data JSONB;

-- Add text columns for user metadata
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS accountability_partner TEXT;

-- Add UUID columns for current position tracking
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS current_phase_id UUID;

ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS current_operation_id UUID;

ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS current_step_id UUID;

-- Add comments
COMMENT ON COLUMN public.project_runs.issue_reports IS 'JSONB field storing issue reports and problem tracking data';
COMMENT ON COLUMN public.project_runs.time_tracking IS 'JSONB field storing time tracking entries for project work';
COMMENT ON COLUMN public.project_runs.project_photos IS 'JSONB field storing project photo metadata and URLs';
COMMENT ON COLUMN public.project_runs.phase_ratings IS 'JSONB field storing phase ratings and feedback';
COMMENT ON COLUMN public.project_runs.schedule_events IS 'JSONB field storing scheduled events and timeline data';
COMMENT ON COLUMN public.project_runs.shopping_checklist_data IS 'JSONB field storing shopping checklist items and status';
COMMENT ON COLUMN public.project_runs.accountability_partner IS 'Name of the accountability partner for this project';
COMMENT ON COLUMN public.project_runs.current_phase_id IS 'UUID of the currently active phase';
COMMENT ON COLUMN public.project_runs.current_operation_id IS 'UUID of the currently active operation';
COMMENT ON COLUMN public.project_runs.current_step_id IS 'UUID of the currently active step';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added missing columns to project_runs table';
  RAISE NOTICE '✅ Added JSONB: issue_reports, time_tracking, project_photos, phase_ratings, schedule_events, shopping_checklist_data';
  RAISE NOTICE '✅ Added TEXT: accountability_partner';
  RAISE NOTICE '✅ Added UUID: current_phase_id, current_operation_id, current_step_id';
END $$;

