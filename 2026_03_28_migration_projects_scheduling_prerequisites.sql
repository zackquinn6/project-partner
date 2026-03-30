-- Persist decision-tree scheduling prerequisites (phase / operation / step) for the project scheduler.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS scheduling_prerequisites jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.projects.scheduling_prerequisites IS
  'Map of entity UUID (phase, phase_operation, or operation_step id) to JSON array of prerequisite entity UUID strings. Consumed by ProjectScheduler to add task dependency edges.';
