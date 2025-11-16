-- Check if standard foundation has operations for the standard_phase_ids Interior Painting is looking for

-- 1. Check standard foundation phases that match Interior Painting's standard_phase_ids
SELECT 
  pp.id as phase_id,
  pp.name as phase_name,
  pp.standard_phase_id,
  sp.name as standard_phase_name,
  pp.display_order
FROM public.project_phases pp
LEFT JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
WHERE pp.project_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND pp.standard_phase_id IN (
    'fb93eeff-45b0-43a1-92a4-ccc517368e20', -- Kickoff
    '6643dc0f-937e-4d77-ba64-1d7c00a71562', -- Planning
    'fa148acc-295b-4e4b-80ad-75a3bab1f463', -- Ordering
    'c8f8ba16-7d2a-4ff7-a8fb-b09a732e9129'  -- Close Project
  )
ORDER BY pp.display_order;

-- 2. Check operations in standard foundation linked by phase_id
SELECT 
  op.id as operation_id,
  op.name as operation_name,
  op.phase_id,
  op.standard_phase_id,
  pp.name as phase_name,
  pp.standard_phase_id as phase_standard_phase_id
FROM public.template_operations op
JOIN public.project_phases pp ON op.phase_id = pp.id
WHERE op.project_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND pp.standard_phase_id IN (
    'fb93eeff-45b0-43a1-92a4-ccc517368e20', -- Kickoff
    '6643dc0f-937e-4d77-ba64-1d7c00a71562', -- Planning
    'fa148acc-295b-4e4b-80ad-75a3bab1f463', -- Ordering
    'c8f8ba16-7d2a-4ff7-a8fb-b09a732e9129'  -- Close Project
  )
ORDER BY pp.display_order, op.display_order;

-- 3. Check operations in standard foundation linked by standard_phase_id directly
SELECT 
  op.id as operation_id,
  op.name as operation_name,
  op.phase_id,
  op.standard_phase_id,
  sp.name as standard_phase_name
FROM public.template_operations op
LEFT JOIN public.standard_phases sp ON op.standard_phase_id = sp.id
WHERE op.project_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND op.standard_phase_id IN (
    'fb93eeff-45b0-43a1-92a4-ccc517368e20', -- Kickoff
    '6643dc0f-937e-4d77-ba64-1d7c00a71562', -- Planning
    'fa148acc-295b-4e4b-80ad-75a3bab1f463', -- Ordering
    'c8f8ba16-7d2a-4ff7-a8fb-b09a732e9129'  -- Close Project
  )
ORDER BY op.standard_phase_id, op.display_order;

-- 4. Count operations by standard_phase_id
SELECT 
  COALESCE(op.standard_phase_id, pp.standard_phase_id) as standard_phase_id,
  sp.name as standard_phase_name,
  COUNT(DISTINCT op.id) as operations_count
FROM public.template_operations op
LEFT JOIN public.project_phases pp ON op.phase_id = pp.id
LEFT JOIN public.standard_phases sp ON COALESCE(op.standard_phase_id, pp.standard_phase_id) = sp.id
WHERE op.project_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND COALESCE(op.standard_phase_id, pp.standard_phase_id) IN (
    'fb93eeff-45b0-43a1-92a4-ccc517368e20', -- Kickoff
    '6643dc0f-937e-4d77-ba64-1d7c00a71562', -- Planning
    'fa148acc-295b-4e4b-80ad-75a3bab1f463', -- Ordering
    'c8f8ba16-7d2a-4ff7-a8fb-b09a732e9129'  -- Close Project
  )
GROUP BY COALESCE(op.standard_phase_id, pp.standard_phase_id), sp.name
ORDER BY sp.name;

