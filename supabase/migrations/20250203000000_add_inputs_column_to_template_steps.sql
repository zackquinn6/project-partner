-- Migration: Add inputs column to template_steps table for process variables
-- Process variables are saved as JSON array, similar to materials, tools, and outputs

-- Add inputs column
ALTER TABLE public.template_steps 
ADD COLUMN IF NOT EXISTS inputs JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN public.template_steps.inputs IS 
'Process variables/inputs for this step, stored as JSON array of StepInput objects';

