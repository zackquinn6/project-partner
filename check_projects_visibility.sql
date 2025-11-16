-- Check why projects aren't showing in catalog

-- 1. Check Interior Painting project directly
SELECT 
  id,
  name,
  is_current_version,
  publish_status,
  is_standard_template
FROM public.projects
WHERE name ILIKE '%interior painting%';

-- 2. Check project_templates_live view
SELECT 
  id,
  name,
  is_current_version,
  publish_status
FROM public.project_templates_live
WHERE name ILIKE '%interior painting%';

-- 3. Check all projects with is_current_version = true
SELECT 
  id,
  name,
  is_current_version,
  publish_status,
  created_at
FROM public.project_templates_live
WHERE is_current_version = true
ORDER BY created_at DESC;

-- 4. Check what rebuild_phases_json_from_project_phases returns for Interior Painting
SELECT 
  id,
  name,
  is_current_version,
  CASE 
    WHEN phases IS NULL THEN 'NULL'
    WHEN phases = '[]'::jsonb THEN 'EMPTY ARRAY'
    ELSE 'HAS PHASES'
  END as phases_status,
  jsonb_array_length(COALESCE(phases, '[]'::jsonb)) as phases_count
FROM public.project_templates_live
WHERE id = '07f3617a-f3a5-4b1a-99e5-2799a71c2ae1'::uuid;

