-- Optional override for task progress (0-100). When NULL, progress is computed from last_completed and frequency.
ALTER TABLE public.user_maintenance_tasks
  ADD COLUMN IF NOT EXISTS progress_percentage smallint
  CHECK (progress_percentage IS NULL OR (progress_percentage >= 0 AND progress_percentage <= 100));

COMMENT ON COLUMN public.user_maintenance_tasks.progress_percentage IS 'Optional manual progress 0-100. When NULL, progress is derived from last_completed and frequency_days.';
