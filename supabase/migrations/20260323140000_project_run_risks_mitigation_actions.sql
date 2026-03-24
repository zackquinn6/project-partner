-- Copied from template risks at run creation; UI tracks per-run mitigation actions here.
-- Matches project_risks.mitigation_actions (jsonb array of { action, benefit? }).
ALTER TABLE public.project_run_risks
  ADD COLUMN IF NOT EXISTS mitigation_actions jsonb;
