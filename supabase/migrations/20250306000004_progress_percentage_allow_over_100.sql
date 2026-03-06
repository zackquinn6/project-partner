-- Allow progress_percentage above 100 (e.g. overdue tasks). Drop existing 0-100 check and replace.
ALTER TABLE public.user_maintenance_tasks
  DROP CONSTRAINT IF EXISTS user_maintenance_tasks_progress_percentage_check;

ALTER TABLE public.user_maintenance_tasks
  ADD CONSTRAINT user_maintenance_tasks_progress_percentage_check
  CHECK (progress_percentage IS NULL OR (progress_percentage >= 0 AND progress_percentage <= 9999));

COMMENT ON COLUMN public.user_maintenance_tasks.progress_percentage IS 'Optional manual progress 0-9999 (e.g. 150 when overdue). When NULL, progress is derived from last_completed and frequency_days.';
