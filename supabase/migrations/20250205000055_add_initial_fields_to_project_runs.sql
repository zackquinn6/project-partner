-- =====================================================
-- ADD INITIAL FIELDS TO PROJECT_RUNS TABLE
-- These fields store the initial project setup values
-- from the kickoff workflow
-- =====================================================

-- Add initial_budget column
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS initial_budget TEXT;

-- Add initial_timeline column
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS initial_timeline TIMESTAMPTZ;

-- Add initial_sizing column
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS initial_sizing JSONB;

-- Add comments
COMMENT ON COLUMN public.project_runs.initial_budget IS 'Initial budget estimate for the project (user-entered during kickoff)';
COMMENT ON COLUMN public.project_runs.initial_timeline IS 'Initial target completion date (user-entered during kickoff)';
COMMENT ON COLUMN public.project_runs.initial_sizing IS 'Initial sizing data for project spaces (JSONB format, references project_run_spaces)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added initial_budget, initial_timeline, and initial_sizing columns to project_runs table';
END $$;

