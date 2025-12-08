-- =====================================================
-- ADD BUDGET_DATA COLUMN TO PROJECT_RUNS
-- AND CREATE PROJECT_RUN_SPACE_SIZING TABLE
-- =====================================================

-- Add budget_data column to project_runs
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS budget_data JSONB;

-- Add comment for budget_data
COMMENT ON COLUMN public.project_runs.budget_data IS 'JSONB field storing budget tracking data including lineItems, actualEntries, and lastUpdated timestamp';

-- Create project_run_space_sizing table
CREATE TABLE IF NOT EXISTS public.project_run_space_sizing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.project_run_spaces(id) ON DELETE CASCADE,
  scaling_unit TEXT NOT NULL,
  size_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(space_id, scaling_unit)
);

-- Create index on space_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_run_space_sizing_space_id 
ON public.project_run_space_sizing(space_id);

-- Add comment for the table
COMMENT ON TABLE public.project_run_space_sizing IS 'Stores sizing data for project run spaces, including scaling unit and size values (JSONB format)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added budget_data column to project_runs and created project_run_space_sizing table';
END $$;

