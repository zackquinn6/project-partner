-- Vocab merge export: every tool and material reference outside the library (read-only).
-- Run in Project Partner's Supabase SQL editor. Save the single `payload` cell as
-- pp-3-references.json (or the downloaded result as pp-3-references.csv) in the export folder.
--
-- Step tool/material entries come in two stored shapes:
--   step_entry         { id, name, ... }                      id is per entry; links by name only
--   library_selection  { item, coreItemId, isPrime, ... }     item is the name; coreItemId is the library id
-- Some JSON columns hold a JSON string that itself contains the JSON (project_runs.phases); those
-- are decoded once. References are grouped by (source, kind, shape, name, library_id) with a count.
WITH
projects AS (
  SELECT CASE jsonb_typeof(phases) WHEN 'array' THEN phases WHEN 'string' THEN (phases #>> '{}')::jsonb END AS phases
  FROM public.projects
),
runs AS (
  SELECT CASE jsonb_typeof(phases) WHEN 'array' THEN phases WHEN 'string' THEN (phases #>> '{}')::jsonb END AS phases,
         CASE jsonb_typeof(shopping_checklist_data)
           WHEN 'object' THEN shopping_checklist_data
           WHEN 'string' THEN (shopping_checklist_data #>> '{}')::jsonb
         END AS shopping
  FROM public.project_runs
),
profiles AS (
  SELECT CASE jsonb_typeof(owned_tools) WHEN 'array' THEN owned_tools WHEN 'string' THEN (owned_tools #>> '{}')::jsonb END AS owned_tools
  FROM public.user_profiles
),
step_entries AS (
  SELECT 'operation_steps' AS source, 'tool' AS kind, e
  FROM public.operation_steps s,
       jsonb_array_elements(CASE WHEN jsonb_typeof(s.tools) = 'array' THEN s.tools END) e
  UNION ALL
  SELECT 'operation_steps', 'material', e
  FROM public.operation_steps s,
       jsonb_array_elements(CASE WHEN jsonb_typeof(s.materials) = 'array' THEN s.materials END) e
  UNION ALL
  SELECT 'projects.phases', 'tool', e
  FROM projects p, jsonb_path_query(p.phases, 'lax $[*].operations[*].steps[*].tools[*]') e
  UNION ALL
  SELECT 'projects.phases', 'material', e
  FROM projects p, jsonb_path_query(p.phases, 'lax $[*].operations[*].steps[*].materials[*]') e
  UNION ALL
  SELECT 'project_runs.phases', 'tool', e
  FROM runs r, jsonb_path_query(r.phases, 'lax $[*].operations[*].steps[*].tools[*]') e
  UNION ALL
  SELECT 'project_runs.phases', 'material', e
  FROM runs r, jsonb_path_query(r.phases, 'lax $[*].operations[*].steps[*].materials[*]') e
),
refs AS (
  SELECT source, kind,
         CASE
           WHEN jsonb_typeof(e) <> 'object' THEN jsonb_typeof(e)
           WHEN e ? 'coreItemId' THEN 'library_selection'
           ELSE 'step_entry'
         END AS shape,
         CASE
           WHEN jsonb_typeof(e) <> 'object' THEN NULL
           WHEN e ? 'coreItemId' THEN e->>'item'
           ELSE e->>'name'
         END AS name,
         CASE
           WHEN jsonb_typeof(e) <> 'object' THEN NULL
           WHEN e ? 'coreItemId' THEN e->>'coreItemId'
           WHEN kind = 'tool' THEN e->>'library_tool_id'
           ELSE e->>'library_material_id'
         END AS library_id
  FROM step_entries
  UNION ALL
  SELECT 'project_runs.shopping_checklist_data',
         CASE WHEN e->>'itemType' IN ('tool', 'material') THEN e->>'itemType' ELSE 'unknown' END,
         'ordered_item', e->>'itemName', NULL
  FROM runs r,
       jsonb_array_elements(CASE WHEN jsonb_typeof(r.shopping->'orderedItems') = 'array' THEN r.shopping->'orderedItems' END) e
  UNION ALL
  -- Same name rule as the app's loadUserOwnedTools: name, else item.
  SELECT 'user_profiles.owned_tools', 'tool', 'owned_tool',
         CASE WHEN nullif(btrim(e->>'name'), '') IS NOT NULL THEN e->>'name' ELSE e->>'item' END,
         e->>'tool_id'
  FROM profiles u,
       jsonb_array_elements(CASE WHEN jsonb_typeof(u.owned_tools) = 'array' THEN u.owned_tools END) e
  UNION ALL
  SELECT 'user_tools', 'tool', 'row', t.name, t.tool_id::text FROM public.user_tools t
  UNION ALL
  SELECT 'user_materials', 'material', 'row', m.name, m.material_id::text FROM public.user_materials m
),
grouped AS (
  SELECT source, kind, shape, name, library_id, count(*) AS count
  FROM refs
  GROUP BY source, kind, shape, name, library_id
)
SELECT jsonb_build_object(
  'query', 'pp-3-references',
  'version', 2,
  'exported_at', now(),
  'counts', jsonb_build_object('references', (SELECT count(*) FROM refs)),
  'references', (SELECT jsonb_agg(to_jsonb(g) ORDER BY g.source, g.kind, g.shape, g.name) FROM grouped g)
)::text AS payload;
