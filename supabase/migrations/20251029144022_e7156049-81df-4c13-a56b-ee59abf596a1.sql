-- Add budget_data column to project_runs table for budget tracking feature
ALTER TABLE public.project_runs
ADD COLUMN IF NOT EXISTS budget_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.project_runs.budget_data IS 'Stores project budget information including line items and actual expenses';