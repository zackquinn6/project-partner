-- Add notes column to project_risks table
ALTER TABLE public.project_risks
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add notes column to project_run_risks table
ALTER TABLE public.project_run_risks
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment
COMMENT ON COLUMN public.project_risks.notes IS 'Additional notes for the risk';
COMMENT ON COLUMN public.project_run_risks.notes IS 'Additional notes for the risk';

