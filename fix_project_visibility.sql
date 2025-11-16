-- Fix project visibility - ensure Interior Painting has is_current_version = true

-- 1. Check current state
SELECT 
  id,
  name,
  is_current_version,
  publish_status
FROM public.projects
WHERE id = '07f3617a-f3a5-4b1a-99e5-2799a71c2ae1'::uuid;

-- 2. Set is_current_version = true if it's false or NULL
UPDATE public.projects
SET is_current_version = true
WHERE id = '07f3617a-f3a5-4b1a-99e5-2799a71c2ae1'::uuid
  AND (is_current_version IS NULL OR is_current_version = false);

-- 3. Verify after update
SELECT 
  id,
  name,
  is_current_version,
  publish_status
FROM public.projects
WHERE id = '07f3617a-f3a5-4b1a-99e5-2799a71c2ae1'::uuid;

-- 4. Check what project_templates_live returns
SELECT 
  id,
  name,
  is_current_version,
  publish_status,
  jsonb_array_length(COALESCE(phases, '[]'::jsonb)) as phases_count
FROM public.project_templates_live
WHERE id = '07f3617a-f3a5-4b1a-99e5-2799a71c2ae1'::uuid;

