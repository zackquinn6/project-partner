-- Add severity field to project_risks and project_run_risks
-- Severity is stored as free-text, but the application constrains it
-- to a High / Medium / Low scale.

ALTER TABLE public.project_risks
  ADD COLUMN IF NOT EXISTS severity TEXT NULL;

ALTER TABLE public.project_run_risks
  ADD COLUMN IF NOT EXISTS severity TEXT NULL;

