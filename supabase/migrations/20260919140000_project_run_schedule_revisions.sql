-- Append-only schedule revisions: Goal Finish = first, Est Finish = latest.

-- ---------------------------------------------------------------------------
-- project_runs.first_schedule_finish_at (immutable once set)
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_runs
  ADD COLUMN IF NOT EXISTS first_schedule_finish_at timestamptz;

CREATE OR REPLACE FUNCTION public.preserve_first_schedule_finish_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.first_schedule_finish_at IS NOT NULL THEN
    NEW.first_schedule_finish_at := OLD.first_schedule_finish_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_runs_preserve_first_schedule_finish_at ON public.project_runs;
CREATE TRIGGER project_runs_preserve_first_schedule_finish_at
  BEFORE UPDATE OF first_schedule_finish_at ON public.project_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_first_schedule_finish_at();

-- ---------------------------------------------------------------------------
-- project_run_schedule_revisions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_run_schedule_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id uuid NOT NULL REFERENCES public.project_runs (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  finish_at timestamptz NOT NULL,
  schedule_events jsonb NOT NULL,
  CONSTRAINT project_run_schedule_revisions_source_check
    CHECK (source IN ('manual', 'auto_regen', 'slip')),
  CONSTRAINT project_run_schedule_revisions_schedule_events_is_object
    CHECK (jsonb_typeof(schedule_events) = 'object')
);

CREATE INDEX IF NOT EXISTS project_run_schedule_revisions_run_created_idx
  ON public.project_run_schedule_revisions (project_run_id, created_at);

ALTER TABLE public.project_run_schedule_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_run_schedule_revisions_select_own ON public.project_run_schedule_revisions;
CREATE POLICY project_run_schedule_revisions_select_own ON public.project_run_schedule_revisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_runs pr
      WHERE pr.id = project_run_schedule_revisions.project_run_id
        AND pr.user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS project_run_schedule_revisions_insert_own ON public.project_run_schedule_revisions;
CREATE POLICY project_run_schedule_revisions_insert_own ON public.project_run_schedule_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_runs pr
      WHERE pr.id = project_run_schedule_revisions.project_run_id
        AND pr.user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS project_run_schedule_revisions_delete_own ON public.project_run_schedule_revisions;
CREATE POLICY project_run_schedule_revisions_delete_own ON public.project_run_schedule_revisions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_runs pr
      WHERE pr.id = project_run_schedule_revisions.project_run_id
        AND pr.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- Backfill: one revision from current schedule_events (history not recoverable)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  ev jsonb;
  event_ts timestamptz;
  duration_min integer;
  max_end timestamptz;
BEGIN
  FOR r IN
    SELECT id, schedule_events
    FROM public.project_runs
    WHERE schedule_events IS NOT NULL
      AND jsonb_typeof(schedule_events->'events') = 'array'
      AND jsonb_array_length(schedule_events->'events') > 0
  LOOP
    max_end := NULL;
    FOR ev IN SELECT value FROM jsonb_array_elements(r.schedule_events->'events') AS t(value)
    LOOP
      IF ev ? 'date' AND NULLIF(ev->>'date', '') IS NOT NULL THEN
        BEGIN
          duration_min := COALESCE(NULLIF(ev->>'duration', '')::integer, 0);
          event_ts := ((ev->>'date')::date + (duration_min || ' minutes')::interval);
          IF max_end IS NULL OR event_ts > max_end THEN
            max_end := event_ts;
          END IF;
        EXCEPTION WHEN others THEN
          CONTINUE;
        END;
      ELSIF ev ? 'endTime' AND NULLIF(ev->>'endTime', '') IS NOT NULL THEN
        BEGIN
          event_ts := (ev->>'endTime')::timestamptz;
          IF max_end IS NULL OR event_ts > max_end THEN
            max_end := event_ts;
          END IF;
        EXCEPTION WHEN others THEN
          CONTINUE;
        END;
      END IF;
    END LOOP;

    IF max_end IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.project_run_schedule_revisions (
      project_run_id,
      source,
      finish_at,
      schedule_events
    )
    SELECT r.id, 'manual', max_end, r.schedule_events
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.project_run_schedule_revisions x
      WHERE x.project_run_id = r.id
    );

    UPDATE public.project_runs
    SET first_schedule_finish_at = max_end
    WHERE id = r.id
      AND first_schedule_finish_at IS NULL;
  END LOOP;
END $$;
