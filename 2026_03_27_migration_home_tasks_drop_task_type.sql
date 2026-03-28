-- Remove redundant task_type from home_tasks (covered by other fields such as diy_level and project linkage).
ALTER TABLE public.home_tasks
  DROP COLUMN IF EXISTS task_type;
