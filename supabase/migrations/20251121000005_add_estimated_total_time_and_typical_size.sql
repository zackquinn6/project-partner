-- Add estimated_total_time and typical_project_size to projects table
-- These fields help users understand time estimates per scaling unit and total time for typical project size

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS estimated_total_time TEXT,
ADD COLUMN IF NOT EXISTS typical_project_size NUMERIC;

COMMENT ON COLUMN public.projects.estimated_total_time IS 'Estimated total time for a typical project size (e.g., "40-60 hours")';
COMMENT ON COLUMN public.projects.typical_project_size IS 'Typical project size used for the estimated total time calculation (e.g., 100 for 100 sqft)';

