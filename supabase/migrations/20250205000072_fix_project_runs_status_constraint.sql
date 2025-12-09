-- =====================================================
-- FIX project_runs status CHECK CONSTRAINT
-- Add missing status values: 'in-progress' and 'not-started'
-- =====================================================

-- Drop the existing constraint
ALTER TABLE public.project_runs 
DROP CONSTRAINT IF EXISTS project_runs_status_check;

-- Add the updated constraint with all valid status values
ALTER TABLE public.project_runs 
ADD CONSTRAINT project_runs_status_check 
CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'in-progress', 'not-started'));

-- Add comment
COMMENT ON COLUMN public.project_runs.status IS 'Project run status: active, paused, completed, cancelled, in-progress, or not-started';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Updated project_runs status constraint to include in-progress and not-started';
END $$;

