-- Ensures progress reporting style is stored on each project run.
-- This is used by progressCalculation and the ProgressReportingStyleDialog.

ALTER TABLE public.project_runs
  ADD COLUMN IF NOT EXISTS progress_reporting_style TEXT NOT NULL DEFAULT 'linear'
  CHECK (progress_reporting_style IN ('linear', 'exponential', 'time-based'));

COMMENT ON COLUMN public.project_runs.progress_reporting_style IS
  'Progress calculation method: "linear" (step count-based), "exponential" (weighted), or "time-based" (uses time estimates).';

