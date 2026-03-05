-- Add criticality column to user_maintenance_tasks for home maintenance health score and task priority.
-- 1 = Low, 2 = Medium, 3 = High. Default 2.

ALTER TABLE public.user_maintenance_tasks
  ADD COLUMN IF NOT EXISTS criticality smallint DEFAULT 2
  CHECK (criticality IS NULL OR criticality IN (1, 2, 3));

COMMENT ON COLUMN public.user_maintenance_tasks.criticality IS 'Task priority: 1 Low, 2 Medium, 3 High. Used in health score calculation.';
