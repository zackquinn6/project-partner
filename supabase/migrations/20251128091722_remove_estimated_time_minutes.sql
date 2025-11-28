-- Migration: Remove estimated_time_minutes column from template_steps
-- Reason: Replaced by time_estimate_low, time_estimate_medium, time_estimate_high fields

-- Drop the estimated_time_minutes column from template_steps table
ALTER TABLE public.template_steps
DROP COLUMN IF EXISTS estimated_time_minutes;

-- Verify the column has been removed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'template_steps' 
      AND column_name = 'estimated_time_minutes'
  ) THEN
    RAISE EXCEPTION 'Column estimated_time_minutes still exists after drop attempt';
  ELSE
    RAISE NOTICE '✅ Successfully removed estimated_time_minutes column from template_steps';
  END IF;
END $$;

