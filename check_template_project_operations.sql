-- Query to check if template project has phases and operations
-- Replace <template_project_id> with your Interior Painting project ID

-- 1. Check if project exists and get its info
SELECT 
  id,
  name,
  is_standard_template,
  created_at
FROM public.projects
WHERE name ILIKE '%interior painting%'
LIMIT 5;

-- 2. Check if project has project_phases entries
SELECT 
  pp.id as phase_id,
  pp.name as phase_name,
  pp.is_standard,
  pp.standard_phase_id,
  pp.display_order
FROM public.project_phases pp
WHERE pp.project_id IN (
  SELECT id FROM public.projects WHERE name ILIKE '%interior painting%' LIMIT 1
)
ORDER BY pp.display_order;

-- 3. Check if project has template_operations linked via phase_id
SELECT 
  op.id as operation_id,
  op.name as operation_name,
  op.phase_id,
  op.standard_phase_id,
  op.is_reference,
  op.source_operation_id,
  pp.name as phase_name
FROM public.template_operations op
LEFT JOIN public.project_phases pp ON op.phase_id = pp.id
WHERE op.project_id IN (
  SELECT id FROM public.projects WHERE name ILIKE '%interior painting%' LIMIT 1
)
ORDER BY op.display_order;

-- 4. Check standard foundation operations for fallback
SELECT 
  op.id as operation_id,
  op.name as operation_name,
  op.phase_id,
  op.standard_phase_id,
  pp.name as phase_name,
  sp.name as standard_phase_name
FROM public.template_operations op
JOIN public.project_phases pp ON op.phase_id = pp.id
LEFT JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
WHERE op.project_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY pp.display_order, op.display_order;

-- 5. Test rebuild_phases_json_from_project_phases function result
SELECT 
  jsonb_array_length(public.rebuild_phases_json_from_project_phases(
    (SELECT id FROM public.projects WHERE name ILIKE '%interior painting%' LIMIT 1)
  )) as phases_count,
  jsonb_pretty(public.rebuild_phases_json_from_project_phases(
    (SELECT id FROM public.projects WHERE name ILIKE '%interior painting%' LIMIT 1)
  )) as phases_json;

