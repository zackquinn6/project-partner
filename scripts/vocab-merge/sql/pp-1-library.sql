-- Vocab merge export: Project Partner tool and material library (read-only).
-- Run in Project Partner's Supabase SQL editor. Save the single `payload` cell as pp-1-library.json
-- (or the downloaded result as pp-1-library.csv) in the export folder.
WITH
tools AS (SELECT id, name, category, alternates, description FROM public.tools),
tool_variations AS (SELECT id, core_item_id, name, sku FROM public.tool_variations),
materials AS (SELECT id, name, category, alternates, description FROM public.materials),
materials_variants AS (SELECT id, material_id, name, sku FROM public.materials_variants)
SELECT jsonb_build_object(
  'query', 'pp-1-library',
  'version', 1,
  'exported_at', now(),
  'counts', jsonb_build_object(
    'tools', (SELECT count(*) FROM tools),
    'tool_variations', (SELECT count(*) FROM tool_variations),
    'materials', (SELECT count(*) FROM materials),
    'materials_variants', (SELECT count(*) FROM materials_variants)
  ),
  'tables', jsonb_build_object(
    'tools', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM tools t),
    'tool_variations', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM tool_variations t),
    'materials', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM materials t),
    'materials_variants', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM materials_variants t)
  )
)::text AS payload;
