-- Inserts from create_project_run_snapshot_v2 (and similar) often omit `status` or use
-- legacy values (not_started, in_progress) that fail project_runs_status_check.
-- A misplaced schedule_optimization_method value in `status` (e.g. single-piece-flow)
-- also violates the check. Normalize on INSERT only so the constraint always passes.

ALTER TABLE public.project_runs
  ALTER COLUMN status SET DEFAULT 'not-started';

CREATE OR REPLACE FUNCTION public.project_runs_normalize_status_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NULL THEN
    NEW.status := 'not-started';
    RETURN NEW;
  END IF;

  IF NEW.status IN ('not_started', 'not started', 'notstarted') THEN
    NEW.status := 'not-started';
  ELSIF NEW.status IN ('in_progress', 'in progress', 'inprogress') THEN
    NEW.status := 'in-progress';
  ELSIF NEW.status IN ('completed', 'done', 'finished') THEN
    NEW.status := 'complete';
  ELSIF NEW.status IN ('canceled') THEN
    NEW.status := 'cancelled';
  ELSIF NEW.status IN ('single-piece-flow', 'batch-flow') THEN
    IF NEW.schedule_optimization_method IS NULL THEN
      NEW.schedule_optimization_method := NEW.status;
    END IF;
    NEW.status := 'not-started';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_runs_normalize_status_before_insert ON public.project_runs;

CREATE TRIGGER project_runs_normalize_status_before_insert
  BEFORE INSERT ON public.project_runs
  FOR EACH ROW
  EXECUTE PROCEDURE public.project_runs_normalize_status_before_insert();
