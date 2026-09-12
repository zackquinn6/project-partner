-- Absolute deadline for Project Scheduler (Latest Acceptable Date).
-- Seeded once as target completion (initial_timeline) + 30 days; thereafter user-controlled.
-- Inherits existing project_runs RLS policies.
ALTER TABLE public.project_runs
  ADD COLUMN IF NOT EXISTS latest_acceptable_date date;

COMMENT ON COLUMN public.project_runs.latest_acceptable_date IS
  'Scheduler latest acceptable (drop-dead) date; seeded once from initial_timeline + 30 days';
