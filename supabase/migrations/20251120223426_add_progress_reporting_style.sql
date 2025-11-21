-- Add progress_reporting_style column to project_runs table
-- This allows users to choose how progress is calculated: linear, exponential, or time-based

ALTER TABLE public.project_runs
  ADD COLUMN IF NOT EXISTS progress_reporting_style TEXT NOT NULL DEFAULT 'linear' 
    CHECK (progress_reporting_style IN ('linear', 'exponential', 'time-based'));

COMMENT ON COLUMN public.project_runs.progress_reporting_style IS 
  'Progress calculation method: "linear" (step count-based), "exponential" (weighted toward completion), or "time-based" (uses time estimates with speed setting)';

