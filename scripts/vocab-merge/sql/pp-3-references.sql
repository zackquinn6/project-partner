-- Vocab merge export: every tool and material reference outside the library (read-only).
-- Run in Project Partner's Supabase SQL editor. Save the single `payload` cell as
-- pp-3-references.json (or the downloaded result as pp-3-references.csv) in the export folder.
--
-- References are grouped by (source, kind, name, library_id) with a count; matching only needs
-- the distinct names. Step entries carry no library id (their `id` is per entry), so library_id
-- is set only for sources that store one. Non-array JSON values contribute no rows.
WITH refs AS (
  SELECT 'operation_steps' AS source, 'tool' AS kind, e->>'name' AS name,
         e->>'library_tool_id' AS library_id
  FROM public.operation_steps s,
       jsonb_array_elements(CASE WHEN jsonb_typeof(s.tools) = 'array' THEN s.tools END) e
  UNION ALL
  SELECT 'operation_steps', 'material', e->>'name', e->>'library_material_id'
  FROM public.operation_steps s,
       jsonb_array_elements(CASE WHEN jsonb_typeof(s.materials) = 'array' THEN s.materials END) e
  UNION ALL
  SELECT 'projects.phases', 'tool', e->>'name', e->>'library_tool_id'
  FROM public.projects p,
       jsonb_path_query(CASE WHEN jsonb_typeof(p.phases) = 'array' THEN p.phases END,
                        'lax $[*].operations[*].steps[*].tools[*]') e
  UNION ALL
  SELECT 'projects.phases', 'material', e->>'name', e->>'library_material_id'
  FROM public.projects p,
       jsonb_path_query(CASE WHEN jsonb_typeof(p.phases) = 'array' THEN p.phases END,
                        'lax $[*].operations[*].steps[*].materials[*]') e
  UNION ALL
  SELECT 'project_runs.phases', 'tool', e->>'name', e->>'library_tool_id'
  FROM public.project_runs r,
       jsonb_path_query(CASE WHEN jsonb_typeof(r.phases) = 'array' THEN r.phases END,
                        'lax $[*].operations[*].steps[*].tools[*]') e
  UNION ALL
  SELECT 'project_runs.phases', 'material', e->>'name', e->>'library_material_id'
  FROM public.project_runs r,
       jsonb_path_query(CASE WHEN jsonb_typeof(r.phases) = 'array' THEN r.phases END,
                        'lax $[*].operations[*].steps[*].materials[*]') e
  UNION ALL
  SELECT 'project_runs.shopping_checklist_data',
         CASE WHEN e->>'itemType' IN ('tool', 'material') THEN e->>'itemType' ELSE 'unknown' END,
         e->>'itemName', NULL
  FROM public.project_runs r,
       jsonb_array_elements(
         CASE WHEN jsonb_typeof(r.shopping_checklist_data->'orderedItems') = 'array'
              THEN r.shopping_checklist_data->'orderedItems' END) e
  UNION ALL
  -- Same name rule as the app's loadUserOwnedTools: name, else item.
  SELECT 'user_profiles.owned_tools', 'tool',
         CASE WHEN nullif(btrim(e->>'name'), '') IS NOT NULL THEN e->>'name' ELSE e->>'item' END,
         e->>'tool_id'
  FROM public.user_profiles u,
       jsonb_array_elements(CASE WHEN jsonb_typeof(u.owned_tools) = 'array' THEN u.owned_tools END) e
  UNION ALL
  SELECT 'user_tools', 'tool', t.name, t.tool_id::text FROM public.user_tools t
  UNION ALL
  SELECT 'user_materials', 'material', m.name, m.material_id::text FROM public.user_materials m
),
grouped AS (
  SELECT source, kind, name, library_id, count(*) AS count
  FROM refs
  GROUP BY source, kind, name, library_id
)
SELECT jsonb_build_object(
  'query', 'pp-3-references',
  'version', 1,
  'exported_at', now(),
  'counts', jsonb_build_object('references', (SELECT count(*) FROM refs)),
  'references', (SELECT jsonb_agg(to_jsonb(g) ORDER BY g.source, g.kind, g.name) FROM grouped g)
)::text AS payload;
