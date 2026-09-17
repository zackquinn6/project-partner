-- Kickoff Goals: quality target for the project run (good / great / professional).
-- Column is covered by existing project_runs RLS policies.

ALTER TABLE public.project_runs
ADD COLUMN IF NOT EXISTS initial_quality_goal text;

ALTER TABLE public.project_runs
DROP CONSTRAINT IF EXISTS project_runs_initial_quality_goal_check;

ALTER TABLE public.project_runs
ADD CONSTRAINT project_runs_initial_quality_goal_check
CHECK (
  initial_quality_goal IS NULL
  OR initial_quality_goal IN ('good', 'great', 'professional')
);

COMMENT ON COLUMN public.project_runs.initial_quality_goal IS
  'Kickoff Goals quality target: good, great, or professional.';
