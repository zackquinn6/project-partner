-- SINGLE DIAGNOSTIC QUERY - Run this to see everything at once
-- Copy this entire block and paste into Supabase SQL Editor, then click "Run"

WITH project_info AS (
  SELECT id, name 
  FROM public.projects 
  WHERE name ILIKE '%interior painting%' 
  LIMIT 1
),
phases_check AS (
  SELECT 
    COUNT(*) as phase_count,
    jsonb_agg(jsonb_build_object(
      'phase_id', pp.id,
      'phase_name', pp.name,
      'is_standard', pp.is_standard,
      'standard_phase_id', pp.standard_phase_id,
      'display_order', pp.display_order
    )) as phases
  FROM public.project_phases pp
  WHERE pp.project_id = (SELECT id FROM project_info)
),
operations_by_phase_id AS (
  SELECT COUNT(*) as count
  FROM public.template_operations op
  WHERE op.project_id = (SELECT id FROM project_info)
    AND op.phase_id IN (SELECT id FROM public.project_phases WHERE project_id = (SELECT id FROM project_info))
),
operations_by_standard_phase_id AS (
  SELECT COUNT(*) as count
  FROM public.template_operations op
  WHERE op.project_id = (SELECT id FROM project_info)
    AND op.phase_id IS NULL
    AND op.standard_phase_id IN (
      SELECT standard_phase_id FROM public.project_phases 
      WHERE project_id = (SELECT id FROM project_info) AND is_standard = true
    )
),
standard_foundation_operations AS (
  SELECT COUNT(*) as count
  FROM public.template_operations op
  JOIN public.project_phases pp ON op.phase_id = pp.id
  WHERE op.project_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND pp.standard_phase_id IN (
      SELECT standard_phase_id FROM public.project_phases 
      WHERE project_id = (SELECT id FROM project_info) AND is_standard = true
    )
),
function_result AS (
  SELECT 
    jsonb_array_length(public.rebuild_phases_json_from_project_phases((SELECT id FROM project_info))) as phases_count,
    jsonb_array_length(
      COALESCE(
        public.rebuild_phases_json_from_project_phases((SELECT id FROM project_info))->0->'operations',
        '[]'::jsonb
      )
    ) as first_phase_operations_count,
    public.rebuild_phases_json_from_project_phases((SELECT id FROM project_info))->0->>'name' as first_phase_name
)
SELECT 
  (SELECT id FROM project_info) as project_id,
  (SELECT name FROM project_info) as project_name,
  (SELECT phase_count FROM phases_check) as has_phases_count,
  (SELECT count FROM operations_by_phase_id) as operations_by_phase_id_count,
  (SELECT count FROM operations_by_standard_phase_id) as operations_by_standard_phase_id_count,
  (SELECT count FROM standard_foundation_operations) as standard_foundation_operations_count,
  (SELECT phases_count FROM function_result) as function_phases_count,
  (SELECT first_phase_operations_count FROM function_result) as function_first_phase_operations_count,
  (SELECT first_phase_name FROM function_result) as function_first_phase_name,
  (SELECT phases FROM phases_check) as phases_details;

