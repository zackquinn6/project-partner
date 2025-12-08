-- =====================================================
-- ADD CUSTOM_PROJECT_NAME COLUMN TO PROJECT_RUNS TABLE
-- This column allows users to customize the project name
-- for their specific project run
-- =====================================================

-- Add custom_project_name column
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS custom_project_name TEXT;

-- Add comment
COMMENT ON COLUMN public.project_runs.custom_project_name IS 'User-customized name for this project run (overrides template name)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added custom_project_name column to project_runs table';
END $$;

