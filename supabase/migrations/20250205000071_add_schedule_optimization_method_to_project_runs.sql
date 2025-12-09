-- =====================================================
-- ADD schedule_optimization_method COLUMN TO project_runs TABLE
-- This column stores the workflow navigation method preference
-- =====================================================

-- Add schedule_optimization_method column
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS schedule_optimization_method TEXT DEFAULT 'single-piece-flow' CHECK (schedule_optimization_method IN ('single-piece-flow', 'batch-flow'));

-- Add comment
COMMENT ON COLUMN public.project_runs.schedule_optimization_method IS 'Workflow navigation method: single-piece-flow (default) processes one space at a time through custom phases; batch-flow processes all spaces through one phase before moving to the next';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added schedule_optimization_method column to project_runs table';
END $$;

