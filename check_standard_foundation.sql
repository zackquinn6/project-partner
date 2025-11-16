-- Check if standard foundation has operations
-- This will tell us if the fallback should work

-- 1. Check if standard foundation project exists
SELECT id, name, is_standard_template 
FROM public.projects 
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- 2. Check if standard foundation has phases
SELECT 
  pp.id as phase_id,
  pp.name as phase_name,
  pp.is_standard,
  pp.standard_phase_id,
  sp.name as standard_phase_name
FROM public.project_phases pp
LEFT JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
WHERE pp.project_id = '00000000-0000-0000-0000-000000000001'::uuid
ORDER BY pp.display_order;

-- 3. Check if standard foundation has operations
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

-- 4. Count operations by phase
SELECT 
  pp.name as phase_name,
  pp.standard_phase_id,
  COUNT(op.id) as operations_count
FROM public.project_phases pp
LEFT JOIN public.template_operations op ON op.phase_id = pp.id AND op.project_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE pp.project_id = '00000000-0000-0000-0000-000000000001'::uuid
GROUP BY pp.name, pp.standard_phase_id, pp.display_order
ORDER BY pp.display_order;

-- 5. Check what standard_phase_ids Interior Painting is looking for
SELECT DISTINCT pp.standard_phase_id, sp.name as standard_phase_name
FROM public.project_phases pp
LEFT JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
WHERE pp.project_id = '07f3617a-f3a5-4b1a-99e5-2799a71c2ae1'::uuid
  AND pp.is_standard = true;

