-- project_runs.status must match values used across the app (ManualProjectDialog, ProjectCatalog, etc.).
-- Legacy rows may use underscores or "completed" instead of "complete".

ALTER TABLE public.project_runs
  DROP CONSTRAINT IF EXISTS project_runs_status_check;

UPDATE public.project_runs
SET status = 'complete'
WHERE status = 'completed';

UPDATE public.project_runs
SET status = 'not-started'
WHERE status = 'not_started';

UPDATE public.project_runs
SET status = 'in-progress'
WHERE status = 'in_progress';

ALTER TABLE public.project_runs
  ADD CONSTRAINT project_runs_status_check
  CHECK (
    status IS NULL
    OR status IN (
      'not-started',
      'in-progress',
      'complete',
      'cancelled'
    )
  );
