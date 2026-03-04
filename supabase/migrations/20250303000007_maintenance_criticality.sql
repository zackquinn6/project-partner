-- Add criticality (1=low, 2=medium, 3=high) to maintenance templates and user tasks.
ALTER TABLE public.maintenance_templates
  ADD COLUMN IF NOT EXISTS criticality INTEGER CHECK (criticality >= 1 AND criticality <= 3);

ALTER TABLE public.user_maintenance_tasks
  ADD COLUMN IF NOT EXISTS criticality INTEGER CHECK (criticality >= 1 AND criticality <= 3);
