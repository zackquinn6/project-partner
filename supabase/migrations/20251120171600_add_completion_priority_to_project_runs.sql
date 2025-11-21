-- Add Completion Priority setting to project_runs
-- This determines the scheduling algorithm: Agile (complete space end-to-end) or Waterfall (complete phase across all spaces)

ALTER TABLE public.project_runs
  ADD COLUMN IF NOT EXISTS completion_priority TEXT DEFAULT 'agile' CHECK (completion_priority IN ('agile', 'waterfall'));

-- Add comment for documentation
COMMENT ON COLUMN public.project_runs.completion_priority IS 'Scheduling priority: "agile" = complete one space end-to-end before moving to next (longer total duration, faster individual space completion). "waterfall" = complete each phase across all spaces before moving to next phase (faster overall completion, all spaces remain partially finished until end).';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_runs_completion_priority ON public.project_runs(completion_priority);

