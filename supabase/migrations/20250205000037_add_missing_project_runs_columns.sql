-- =====================================================
-- ADD MISSING COLUMNS TO PROJECT_RUNS TABLE
-- Add columns needed for manual log entries
-- =====================================================

-- Add description column
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add category column
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add estimated_time column
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS estimated_time TEXT;

-- Add project_leader column
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS project_leader TEXT;

-- Add is_manual_entry column
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT false;

-- Add end_date column (alias for actual_end_date, but keep both for compatibility)
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN public.project_runs.description IS 'Description of the project run';
COMMENT ON COLUMN public.project_runs.category IS 'Category of the project';
COMMENT ON COLUMN public.project_runs.estimated_time IS 'Estimated time for the project';
COMMENT ON COLUMN public.project_runs.project_leader IS 'Name of the project leader';
COMMENT ON COLUMN public.project_runs.is_manual_entry IS 'True if this is a manually logged project (not from a template)';
COMMENT ON COLUMN public.project_runs.end_date IS 'End date of the project (alias for actual_end_date)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added missing columns to project_runs table';
  RAISE NOTICE '✅ Added: description, category, estimated_time, project_leader, is_manual_entry, end_date';
END $$;

