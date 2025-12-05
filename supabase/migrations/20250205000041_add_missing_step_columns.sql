-- =====================================================
-- ADD MISSING COLUMNS TO OPERATION_STEPS TABLE
-- Add apps, content_sections, flow_type, and step_type columns
-- =====================================================

-- Add apps column (JSONB array for apps/tools used in step)
ALTER TABLE public.operation_steps 
ADD COLUMN IF NOT EXISTS apps JSONB DEFAULT '[]'::jsonb;

-- Add content_sections column (JSONB for structured content)
ALTER TABLE public.operation_steps 
ADD COLUMN IF NOT EXISTS content_sections JSONB DEFAULT '[]'::jsonb;

-- Add flow_type column (for step flow control)
ALTER TABLE public.operation_steps 
ADD COLUMN IF NOT EXISTS flow_type TEXT DEFAULT 'prime';

-- Add step_type column (for step classification)
ALTER TABLE public.operation_steps 
ADD COLUMN IF NOT EXISTS step_type TEXT DEFAULT 'prime';

-- Add comments
COMMENT ON COLUMN public.operation_steps.apps IS 'Array of apps/tools used in this step';
COMMENT ON COLUMN public.operation_steps.content_sections IS 'Structured content sections for the step';
COMMENT ON COLUMN public.operation_steps.flow_type IS 'Flow control type for the step (prime, if-necessary, alternate, dependent)';
COMMENT ON COLUMN public.operation_steps.step_type IS 'Step classification type (prime, decision, etc.)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added missing columns to operation_steps table';
  RAISE NOTICE '✅ Added: apps, content_sections, flow_type, step_type';
END $$;

