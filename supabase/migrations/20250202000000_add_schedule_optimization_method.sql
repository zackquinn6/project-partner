-- Migration: Add schedule_optimization_method column to project_runs table
-- Replace completion_priority with schedule_optimization_method
-- This field determines workflow navigation behavior (single-piece-flow vs batch-flow)

-- Step 1: Add new column with default value
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS schedule_optimization_method TEXT 
DEFAULT 'single-piece-flow' 
NOT NULL;

-- Step 2: Add check constraint to ensure only valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'schedule_optimization_method_check'
  ) THEN
    ALTER TABLE public.project_runs
    ADD CONSTRAINT schedule_optimization_method_check 
    CHECK (schedule_optimization_method IN ('single-piece-flow', 'batch-flow'));
  END IF;
END $$;

-- Step 3: Backfill existing rows based on completion_priority if it exists
-- Map: 'agile' → 'single-piece-flow', 'waterfall' → 'batch-flow'
-- If completion_priority doesn't exist or is NULL, default to 'single-piece-flow'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'project_runs' 
    AND column_name = 'completion_priority'
  ) THEN
    UPDATE public.project_runs
    SET schedule_optimization_method = CASE
      WHEN completion_priority = 'waterfall' THEN 'batch-flow'
      WHEN completion_priority = 'agile' THEN 'single-piece-flow'
      ELSE 'single-piece-flow'
    END
    WHERE schedule_optimization_method = 'single-piece-flow'; -- Only update defaults
  END IF;
END $$;

-- Step 4: Drop the old completion_priority column (if it exists)
ALTER TABLE public.project_runs 
DROP COLUMN IF EXISTS completion_priority;

-- Step 5: Add comment to document the column
COMMENT ON COLUMN public.project_runs.schedule_optimization_method IS 
'Workflow navigation method: single-piece-flow (default) processes one space at a time through custom phases; batch-flow processes all spaces through one phase before moving to the next';

-- Step 6: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_runs_schedule_optimization_method 
ON public.project_runs(schedule_optimization_method);

