-- Store the task's scheduled due date at completion time for history/reporting.
ALTER TABLE public.maintenance_completions
  ADD COLUMN IF NOT EXISTS scheduled_due_date timestamptz;

COMMENT ON COLUMN public.maintenance_completions.scheduled_due_date IS 'The task next_due date at the time this completion was recorded.';
