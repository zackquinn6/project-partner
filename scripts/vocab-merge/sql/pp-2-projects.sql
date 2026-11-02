-- Vocab merge export: Project Partner projects and each family's current revision (read-only).
-- Run in Project Partner's Supabase SQL editor. Save the single `payload` cell as pp-2-projects.json
-- (or the downloaded result as pp-2-projects.csv) in the export folder.
WITH
projects AS (
  SELECT id, parent_project_id, name, description, category, tags, publish_status, visibility_status,
         is_foundational, is_standard, item_type, user_id, foundation_project_id, revision_number,
         updated_at
  FROM public.projects
),
family_roots AS (
  SELECT DISTINCT CASE WHEN parent_project_id IS NULL THEN id ELSE parent_project_id END AS root_id
  FROM projects
)
SELECT jsonb_build_object(
  'query', 'pp-2-projects',
  'version', 1,
  'exported_at', now(),
  'counts', jsonb_build_object(
    'projects', (SELECT count(*) FROM projects),
    'families', (SELECT count(*) FROM family_roots)
  ),
  'tables', jsonb_build_object(
    'projects', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM projects t)
  ),
  'latest_published', (
    SELECT jsonb_object_agg(f.root_id, public.latest_published_in_family(f.root_id)) FROM family_roots f
  )
)::text AS payload;
