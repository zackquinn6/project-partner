-- Add workers_needed field to template_steps table
-- This field indicates how many workers are needed for a step (0-10)

ALTER TABLE public.template_steps
  ADD COLUMN IF NOT EXISTS workers_needed INTEGER DEFAULT 0 CHECK (workers_needed >= 0 AND workers_needed <= 10);

-- Add comment for documentation
COMMENT ON COLUMN public.template_steps.workers_needed IS 'Number of workers needed for this step (0-10). 0 means step still requires duration but workers can be assigned elsewhere.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_template_steps_workers_needed ON public.template_steps(workers_needed)
  WHERE workers_needed > 0;

