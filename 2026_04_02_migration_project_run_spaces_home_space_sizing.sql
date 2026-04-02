-- Space import from home + per-unit sizing (used by SpaceSelector, ProjectProfileStep, scheduler).
ALTER TABLE public.project_run_spaces
  ADD COLUMN IF NOT EXISTS home_space_id uuid REFERENCES public.home_spaces (id) ON DELETE SET NULL;

ALTER TABLE public.project_run_spaces
  ADD COLUMN IF NOT EXISTS sizing_by_unit jsonb;

COMMENT ON COLUMN public.project_run_spaces.home_space_id IS 'Source home_spaces row when the run space was imported from the user home.';
COMMENT ON COLUMN public.project_run_spaces.sizing_by_unit IS 'Map of scale unit key to numeric size (e.g. sqft).';
