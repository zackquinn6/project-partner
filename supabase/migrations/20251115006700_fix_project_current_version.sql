-- Fix project visibility - ensure all projects that should be visible have is_current_version = true
-- This fixes the issue where Interior Painting (and potentially other projects) aren't showing in catalog

-- Set is_current_version = true for projects that should be visible but have NULL or false
UPDATE public.projects
SET is_current_version = true
WHERE (is_current_version IS NULL OR is_current_version = false)
  AND (
    -- Published projects should be visible
    publish_status = 'published'
    OR
    -- Projects that have project_phases entries (active projects)
    EXISTS (SELECT 1 FROM public.project_phases pp WHERE pp.project_id = projects.id)
    OR
    -- Interior Painting specifically (in case it's not published yet)
    id = '07f3617a-f3a5-4b1a-99e5-2799a71c2ae1'::uuid
  );

-- Log what was updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % projects by setting is_current_version = true', updated_count;
END $$;

