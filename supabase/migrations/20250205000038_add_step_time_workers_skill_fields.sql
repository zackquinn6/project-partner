-- =====================================================
-- ADD TIME ESTIMATE, WORKERS, AND SKILL LEVEL FIELDS TO OPERATION_STEPS
-- Add fields for time estimates (low, medium, high), workers needed, and skill level
-- =====================================================

-- Add time estimate fields
ALTER TABLE public.operation_steps 
ADD COLUMN IF NOT EXISTS time_estimate_low NUMERIC(10,2) DEFAULT 0;

ALTER TABLE public.operation_steps 
ADD COLUMN IF NOT EXISTS time_estimate_medium NUMERIC(10,2) DEFAULT 0;

ALTER TABLE public.operation_steps 
ADD COLUMN IF NOT EXISTS time_estimate_high NUMERIC(10,2) DEFAULT 0;

-- Add workers needed field
ALTER TABLE public.operation_steps 
ADD COLUMN IF NOT EXISTS workers_needed INTEGER DEFAULT 1;

-- Add skill level field
ALTER TABLE public.operation_steps 
ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'intermediate' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'professional'));

-- Add comments
COMMENT ON COLUMN public.operation_steps.time_estimate_low IS 'Time estimate in hours for best case scenario (10th percentile)';
COMMENT ON COLUMN public.operation_steps.time_estimate_medium IS 'Time estimate in hours for typical/average scenario';
COMMENT ON COLUMN public.operation_steps.time_estimate_high IS 'Time estimate in hours for worst case scenario (90th percentile)';
COMMENT ON COLUMN public.operation_steps.workers_needed IS 'Number of workers needed to complete this step';
COMMENT ON COLUMN public.operation_steps.skill_level IS 'Required skill level: beginner, intermediate, advanced, or professional';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added time estimate, workers, and skill level fields to operation_steps table';
  RAISE NOTICE '✅ Added: time_estimate_low, time_estimate_medium, time_estimate_high, workers_needed, skill_level';
END $$;

