-- project_runs.status must match values used across the app (ManualProjectDialog, ProjectCatalog, etc.).
-- Legacy rows may use underscores, spaces, alternate spellings, title case, or empty string.

ALTER TABLE public.project_runs
  DROP CONSTRAINT IF EXISTS project_runs_status_check;

-- Whitespace-only or empty: treat as unknown (NULL passes check; app treats missing like not started elsewhere)
UPDATE public.project_runs
SET status = NULL
WHERE status IS NOT NULL
  AND btrim(status) = '';

UPDATE public.project_runs
SET status = btrim(status)
WHERE status IS NOT NULL;

-- Map known legacy / typo variants to canonical labels (hyphenated, lowercase)
UPDATE public.project_runs pr
SET status = mapped.canonical
FROM (
  SELECT
    id,
    CASE lower(btrim(status))
      WHEN 'completed' THEN 'complete'
      WHEN 'complete' THEN 'complete'
      WHEN 'done' THEN 'complete'
      WHEN 'finished' THEN 'complete'
      WHEN 'not_started' THEN 'not-started'
      WHEN 'not-started' THEN 'not-started'
      WHEN 'not started' THEN 'not-started'
      WHEN 'notstarted' THEN 'not-started'
      WHEN 'in_progress' THEN 'in-progress'
      WHEN 'in-progress' THEN 'in-progress'
      WHEN 'in progress' THEN 'in-progress'
      WHEN 'inprogress' THEN 'in-progress'
      WHEN 'cancelled' THEN 'cancelled'
      WHEN 'canceled' THEN 'cancelled'
      WHEN 'active' THEN 'in-progress'
      WHEN 'running' THEN 'in-progress'
      WHEN 'started' THEN 'in-progress'
      WHEN 'draft' THEN 'not-started'
      WHEN 'pending' THEN 'not-started'
      WHEN 'planned' THEN 'not-started'
      ELSE NULL
    END AS canonical
  FROM public.project_runs
  WHERE status IS NOT NULL
) mapped
WHERE pr.id = mapped.id
  AND mapped.canonical IS NOT NULL
  AND pr.status IS DISTINCT FROM mapped.canonical;

-- Any remaining non-null value not in the app enum: coerce so the check can be applied
UPDATE public.project_runs
SET status = 'not-started'
WHERE status IS NOT NULL
  AND status NOT IN (
    'not-started',
    'in-progress',
    'complete',
    'cancelled'
  );

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
