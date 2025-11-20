-- Update Step Types with Time Estimates
-- This migration updates step types to support 4 types and adds relational database fields for time estimates

-- 1. Update workflow_step_types table with new step types
INSERT INTO public.workflow_step_types (key, label, description)
VALUES
  ('quality_control_non_scaled', 'Quality Control – Non Scaled', 'Fixed QC steps that do not scale with project size'),
  ('quality_control_scaled', 'Quality Control – Scaled', 'QC steps that scale according to the project scaling unit')
ON CONFLICT (key) DO NOTHING;

-- 2. Add time estimate columns to template_steps
ALTER TABLE public.template_steps
  ADD COLUMN IF NOT EXISTS time_estimate_low NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS time_estimate_medium NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS time_estimate_high NUMERIC(10, 2);

-- 3. Migrate existing time estimates from JSON to columns
-- Extract time estimates from variableTime JSON if they exist
UPDATE public.template_steps
SET 
  time_estimate_low = CASE 
    WHEN content_sections::text LIKE '%"variableTime"%' 
    THEN (content_sections->'timeEstimation'->'variableTime'->>'low')::NUMERIC
    WHEN materials::text LIKE '%"variableTime"%'
    THEN (materials->'timeEstimation'->'variableTime'->>'low')::NUMERIC
    ELSE NULL
  END,
  time_estimate_medium = CASE 
    WHEN content_sections::text LIKE '%"variableTime"%'
    THEN (content_sections->'timeEstimation'->'variableTime'->>'medium')::NUMERIC
    WHEN materials::text LIKE '%"variableTime"%'
    THEN (materials->'timeEstimation'->'variableTime'->>'medium')::NUMERIC
    ELSE NULL
  END,
  time_estimate_high = CASE 
    WHEN content_sections::text LIKE '%"variableTime"%'
    THEN (content_sections->'timeEstimation'->'variableTime'->>'high')::NUMERIC
    WHEN materials::text LIKE '%"variableTime"%'
    THEN (materials->'timeEstimation'->'variableTime'->>'high')::NUMERIC
    ELSE NULL
  END
WHERE time_estimate_low IS NULL 
  AND (content_sections::text LIKE '%"variableTime"%' OR materials::text LIKE '%"variableTime"%');

-- Also check in the phases JSON structure (for steps stored in projects.phases)
-- This is a more complex migration that would need to be done per project
-- For now, we'll rely on the UI to populate these fields going forward

-- 4. Update step_type CHECK constraint to allow 4 types
-- First, update existing 'quality_control' to 'quality_control_non_scaled' for backward compatibility
UPDATE public.template_steps
SET step_type = 'quality_control_non_scaled'
WHERE step_type = 'quality_control';

-- Drop the old constraint
ALTER TABLE public.template_steps
  DROP CONSTRAINT IF EXISTS template_steps_step_type_check;

-- Add new constraint with 4 step types
ALTER TABLE public.template_steps
  ADD CONSTRAINT template_steps_step_type_check 
  CHECK (step_type IN ('prime', 'scaled', 'quality_control_non_scaled', 'quality_control_scaled'));

-- 5. Update default step_type to 'prime' if NULL
UPDATE public.template_steps
SET step_type = 'prime'
WHERE step_type IS NULL;

-- 6. Add comments for documentation
COMMENT ON COLUMN public.template_steps.step_type IS 'Step execution type: prime (fixed, not scaled), scaled (scales with project unit), quality_control_non_scaled (fixed QC), quality_control_scaled (QC that scales)';
COMMENT ON COLUMN public.template_steps.time_estimate_low IS 'Low time estimate in hours (for prime/QC non-scaled) or hours per unit (for scaled/QC scaled)';
COMMENT ON COLUMN public.template_steps.time_estimate_medium IS 'Medium time estimate in hours (for prime/QC non-scaled) or hours per unit (for scaled/QC scaled)';
COMMENT ON COLUMN public.template_steps.time_estimate_high IS 'High time estimate in hours (for prime/QC non-scaled) or hours per unit (for scaled/QC scaled)';

-- 7. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_template_steps_step_type ON public.template_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_template_steps_time_estimates ON public.template_steps(time_estimate_low, time_estimate_medium, time_estimate_high) 
  WHERE time_estimate_low IS NOT NULL OR time_estimate_medium IS NOT NULL OR time_estimate_high IS NOT NULL;

