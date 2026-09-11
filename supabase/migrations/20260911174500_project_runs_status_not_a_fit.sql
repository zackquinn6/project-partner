-- Allow kickoff "Not a fit" to persist on project_runs.status
ALTER TABLE public.project_runs
  DROP CONSTRAINT IF EXISTS project_runs_status_check;

ALTER TABLE public.project_runs
  ADD CONSTRAINT project_runs_status_check
  CHECK (
    (status IS NULL)
    OR (
      status = ANY (
        ARRAY[
          'not-started'::text,
          'in-progress'::text,
          'complete'::text,
          'cancelled'::text,
          'not-a-fit'::text
        ]
      )
    )
  );
