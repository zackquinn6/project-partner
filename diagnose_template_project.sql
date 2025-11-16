-- DIAGNOSTIC QUERIES FOR TEMPLATE PROJECT ISSUES
-- Run these in Supabase SQL Editor to diagnose why operations are empty

-- 1. Find Interior Painting project ID
SELECT id, name, is_standard_template 
FROM public.projects 
WHERE name ILIKE '%interior painting%' 
LIMIT 1;

-- 2. Check if it has project_phases
SELECT 
  pp.id as phase_id,
  pp.name as phase_name,
  pp.is_standard,
  pp.standard_phase_id,
  pp.display_order,
  sp.name as standard_phase_name
FROM public.project_phases pp
LEFT JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
WHERE pp.project_id = (
  SELECT id FROM public.projects WHERE name ILIKE '%interior painting%' LIMIT 1
)
ORDER BY pp.display_order;

-- 3. Check operations linked via phase_id
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
WHERE op.project_id = (
  SELECT id FROM public.projects WHERE name ILIKE '%interior painting%' LIMIT 1
)
ORDER BY op.display_order;

-- 4. Check operations linked via standard_phase_id (without phase_id)
SELECT 
  op.id as operation_id,
  op.name as operation_name,
  op.phase_id,
  op.standard_phase_id,
  op.is_reference,
  pp.name as phase_name
FROM public.template_operations op
LEFT JOIN public.project_phases pp ON op.project_id = pp.project_id AND op.standard_phase_id = pp.standard_phase_id
WHERE op.project_id = (
  SELECT id FROM public.projects WHERE name ILIKE '%interior painting%' LIMIT 1
)
AND op.phase_id IS NULL
ORDER BY op.display_order;

-- 5. Check standard foundation operations (fallback source)
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

-- 6. Test the function output (shows what it returns)
SELECT 
  p.id as project_id,
  p.name as project_name,
  jsonb_array_length(public.rebuild_phases_json_from_project_phases(p.id)) as phases_count,
  jsonb_array_length(
    public.rebuild_phases_json_from_project_phases(p.id)->0->'operations'
  ) as first_phase_operations_count
FROM public.projects p
WHERE p.name ILIKE '%interior painting%'
LIMIT 1;

-- 7. See actual phases JSON structure (truncated to first phase)
SELECT 
  p.id as project_id,
  p.name as project_name,
  public.rebuild_phases_json_from_project_phases(p.id)->0 as first_phase
FROM public.projects p
WHERE p.name ILIKE '%interior painting%'
LIMIT 1;

