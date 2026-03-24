-- Template risks (project_risks) store narrative impact text; project_run_risks had a stricter
-- CHECK that rejected copies during run creation (23514 project_run_risks_impact_check).
-- Align run-level storage with template-level: free-text impact, same as project_risks.

ALTER TABLE public.project_run_risks
  DROP CONSTRAINT IF EXISTS project_run_risks_impact_check;
