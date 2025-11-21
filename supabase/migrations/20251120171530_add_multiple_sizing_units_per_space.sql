-- Add support for multiple sizing units per space
-- This is needed when a project has incorporated phases with different scaling units
-- e.g., a flooring project (sqft) with baseboard installation (linear feet)

-- Add JSONB column to store multiple sizing values per space
-- Each space can have sizing for different units: { "per square foot": 100, "per linear foot": 50 }
ALTER TABLE public.project_run_spaces
  ADD COLUMN IF NOT EXISTS sizing_values JSONB DEFAULT '{}'::jsonb;

-- Migrate existing scale_value and scale_unit to sizing_values
-- This ensures backward compatibility
UPDATE public.project_run_spaces
SET sizing_values = jsonb_build_object(
  COALESCE(scale_unit, 'square foot'),
  COALESCE(scale_value, 0)
)
WHERE sizing_values = '{}'::jsonb
  AND (scale_value IS NOT NULL OR scale_unit IS NOT NULL);

-- Add comment for documentation
COMMENT ON COLUMN public.project_run_spaces.sizing_values IS 'JSONB object storing sizing values for multiple units. Key is scaling unit (e.g., "per square foot"), value is numeric size. Example: {"per square foot": 100, "per linear foot": 50}';

-- Add index for better query performance on sizing_values
CREATE INDEX IF NOT EXISTS idx_project_run_spaces_sizing_values ON public.project_run_spaces USING GIN (sizing_values);

-- Add column to store initial kickoff sizing
-- This stores the initial project size entered at kickoff
ALTER TABLE public.project_runs
  ADD COLUMN IF NOT EXISTS initial_sizing NUMERIC;

-- Add comment for documentation
COMMENT ON COLUMN public.project_runs.initial_sizing IS 'Initial project size entered at kickoff (estimate only, no validation). This is used to initialize the default space created at kickoff.';

