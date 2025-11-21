-- Change default workers_needed from 0 to 1 for new steps
-- Existing steps with 0 will remain 0, but new steps will default to 1

ALTER TABLE public.template_steps
  ALTER COLUMN workers_needed SET DEFAULT 1;

-- Update the comment to reflect the new default
COMMENT ON COLUMN public.template_steps.workers_needed IS 'Number of workers needed for this step (0-10). Defaults to 1. 0 means step still requires duration but workers can be assigned elsewhere.';

