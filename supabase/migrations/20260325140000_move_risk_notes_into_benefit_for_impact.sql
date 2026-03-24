-- Narrative "notes" (stored in risk_description) belong in `benefit` for the
-- "What happens if it does?" column. Only rows where benefit is empty are updated.

UPDATE public.project_risks
SET
  benefit = btrim(risk_description),
  risk_description = NULL
WHERE risk_description IS NOT NULL
  AND btrim(risk_description) <> ''
  AND (benefit IS NULL OR btrim(benefit) = '');

UPDATE public.project_run_risks
SET
  benefit = btrim(risk_description),
  risk_description = NULL
WHERE risk_description IS NOT NULL
  AND btrim(risk_description) <> ''
  AND (benefit IS NULL OR btrim(benefit) = '');
