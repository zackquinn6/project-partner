-- Add scheduled_due_date to record the task's next_due at completion time (plan vs actual tracking).
ALTER TABLE public.maintenance_completions
ADD COLUMN IF NOT EXISTS scheduled_due_date TIMESTAMPTZ;

COMMENT ON COLUMN public.maintenance_completions.scheduled_due_date IS 'Task next_due at time of completion; used to show plan vs actual (e.g. +4 days late).';
