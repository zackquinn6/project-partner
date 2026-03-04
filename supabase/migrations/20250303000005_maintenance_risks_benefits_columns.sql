-- Add risks_of_skipping and benefits_of_maintenance to maintenance templates and user tasks.
ALTER TABLE public.maintenance_templates
  ADD COLUMN IF NOT EXISTS risks_of_skipping TEXT,
  ADD COLUMN IF NOT EXISTS benefits_of_maintenance TEXT;

ALTER TABLE public.user_maintenance_tasks
  ADD COLUMN IF NOT EXISTS risks_of_skipping TEXT,
  ADD COLUMN IF NOT EXISTS benefits_of_maintenance TEXT;
