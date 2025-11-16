-- Test the fallback query directly to see why it's not finding operations
-- This simulates what rebuild_phases_json_from_project_phases does

-- Simulate query for Kickoff phase (first phase in Interior Painting)
SELECT 
  op.id as operation_id,
  op.name as operation_name,
  op.phase_id,
  op.standard_phase_id,
  pp.name as phase_name_in_standard_foundation,
  'Checking fallback for Kickoff phase' as test_note
FROM public.template_operations op
LEFT JOIN public.project_phases pp ON op.phase_id = pp.id
WHERE op.project_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND (
    -- Match by phase_id
    op.phase_id IN (
      SELECT pp.id FROM public.project_phases pp
      WHERE pp.project_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND pp.standard_phase_id = 'fb93eeff-45b0-43a1-92a4-ccc517368e20' -- Kickoff
    )
    OR
    -- Match by standard_phase_id directly
    op.standard_phase_id = 'fb93eeff-45b0-43a1-92a4-ccc517368e20' -- Kickoff
  )
ORDER BY op.display_order;

-- Check what phases exist in standard foundation for Kickoff
SELECT 
  pp.id as phase_id,
  pp.name as phase_name,
  pp.standard_phase_id,
  COUNT(op.id) as operations_count
FROM public.project_phases pp
LEFT JOIN public.template_operations op ON op.phase_id = pp.id AND op.project_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE pp.project_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND pp.standard_phase_id = 'fb93eeff-45b0-43a1-92a4-ccc517368e20' -- Kickoff
GROUP BY pp.id, pp.name, pp.standard_phase_id;

