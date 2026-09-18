-- Every register risk must carry assessed likelihood and severity (low|medium|high).
-- Backfill gaps (prefer legacy impact for severity when valid), then harden columns.

-- project_risks: likelihood
UPDATE public.project_risks
SET likelihood = 'medium'
WHERE likelihood IS NULL
   OR lower(btrim(likelihood)) NOT IN ('low', 'medium', 'high');

UPDATE public.project_risks
SET likelihood = lower(btrim(likelihood))
WHERE likelihood IS NOT NULL
  AND likelihood <> lower(btrim(likelihood))
  AND lower(btrim(likelihood)) IN ('low', 'medium', 'high');

-- project_risks: severity (copy valid impact when severity is missing/invalid)
UPDATE public.project_risks
SET severity = CASE
  WHEN impact IS NOT NULL AND lower(btrim(impact)) IN ('low', 'medium', 'high')
    THEN lower(btrim(impact))
  ELSE 'medium'
END
WHERE severity IS NULL
   OR lower(btrim(severity)) NOT IN ('low', 'medium', 'high');

UPDATE public.project_risks
SET severity = lower(btrim(severity))
WHERE severity IS NOT NULL
  AND severity <> lower(btrim(severity))
  AND lower(btrim(severity)) IN ('low', 'medium', 'high');

-- project_run_risks: likelihood
UPDATE public.project_run_risks
SET likelihood = 'medium'
WHERE likelihood IS NULL
   OR lower(btrim(likelihood)) NOT IN ('low', 'medium', 'high');

UPDATE public.project_run_risks
SET likelihood = lower(btrim(likelihood))
WHERE likelihood IS NOT NULL
  AND likelihood <> lower(btrim(likelihood))
  AND lower(btrim(likelihood)) IN ('low', 'medium', 'high');

-- project_run_risks: severity
UPDATE public.project_run_risks
SET severity = CASE
  WHEN impact IS NOT NULL AND lower(btrim(impact)) IN ('low', 'medium', 'high')
    THEN lower(btrim(impact))
  ELSE 'medium'
END
WHERE severity IS NULL
   OR lower(btrim(severity)) NOT IN ('low', 'medium', 'high');

UPDATE public.project_run_risks
SET severity = lower(btrim(severity))
WHERE severity IS NOT NULL
  AND severity <> lower(btrim(severity))
  AND lower(btrim(severity)) IN ('low', 'medium', 'high');

ALTER TABLE public.project_risks
  ALTER COLUMN likelihood SET DEFAULT 'medium',
  ALTER COLUMN severity SET DEFAULT 'medium';

ALTER TABLE public.project_run_risks
  ALTER COLUMN likelihood SET DEFAULT 'medium',
  ALTER COLUMN severity SET DEFAULT 'medium';

ALTER TABLE public.project_risks
  ALTER COLUMN likelihood SET NOT NULL,
  ALTER COLUMN severity SET NOT NULL;

ALTER TABLE public.project_run_risks
  ALTER COLUMN likelihood SET NOT NULL,
  ALTER COLUMN severity SET NOT NULL;

ALTER TABLE public.project_risks
  DROP CONSTRAINT IF EXISTS project_risks_likelihood_check,
  DROP CONSTRAINT IF EXISTS project_risks_severity_check;

ALTER TABLE public.project_risks
  ADD CONSTRAINT project_risks_likelihood_check
    CHECK (likelihood IN ('low', 'medium', 'high')),
  ADD CONSTRAINT project_risks_severity_check
    CHECK (severity IN ('low', 'medium', 'high'));

ALTER TABLE public.project_run_risks
  DROP CONSTRAINT IF EXISTS project_run_risks_likelihood_check,
  DROP CONSTRAINT IF EXISTS project_run_risks_severity_check;

ALTER TABLE public.project_run_risks
  ADD CONSTRAINT project_run_risks_likelihood_check
    CHECK (likelihood IN ('low', 'medium', 'high')),
  ADD CONSTRAINT project_run_risks_severity_check
    CHECK (severity IN ('low', 'medium', 'high'));
