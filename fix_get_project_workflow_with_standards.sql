-- Fix get_project_workflow_with_standards to ALWAYS pull standard phases from Standard Project Foundation
-- This ensures standard phases and their step content are always copied fresh, not from templates
-- Standard phases are merged with custom phases from the template at the same time

CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(
  p_project_id UUID
)
RETURNS JSONB AS $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  workflow_json JSONB;
  standard_phases_json JSONB;
  custom_phases_json JSONB;
  is_standard_template BOOLEAN;
BEGIN
  -- Check if this is the Standard Project Foundation itself
  SELECT COALESCE(is_standard_template, false) INTO is_standard_template
  FROM public.projects
  WHERE id = p_project_id;
  
  -- If this is the Standard Project Foundation, just return its phases directly
  IF is_standard_template = true OR p_project_id = standard_project_id THEN
    SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
    INTO workflow_json;
    RETURN COALESCE(workflow_json, '[]'::jsonb);
  END IF;
  
  -- ALWAYS get standard phases from Standard Project Foundation (never from templates)
  -- This ensures we get the latest standard phase content and step data
  -- Standard phases and their step content are copied at the same time as custom phases
  SELECT public.rebuild_phases_json_from_project_phases(standard_project_id)
  INTO standard_phases_json;
  
  -- Get custom phases from the template (non-standard phases only)
  -- Build custom phases directly from project_phases where is_standard = false
  custom_phases_json := (
    SELECT COALESCE(jsonb_agg(phase_obj), '[]'::jsonb)
    FROM (
      SELECT 
        jsonb_build_object(
          'id', pp.id::text,
          'name', pp.name,
          'description', pp.description,
          'isStandard', false,
          'display_order', pp.display_order,
          'operations', COALESCE(
            (
              SELECT jsonb_agg(op_obj)
              FROM (
                SELECT 
                  jsonb_build_object(
                    'id', op.id::text,
                    'name', op.name,
                    'description', op.description,
                    'flowType', op.flow_type,
                    'display_order', op.display_order,
                    'steps', public.get_operation_steps_json(op.id, COALESCE(op.is_reference, false))
                  ) as op_obj
                FROM public.template_operations op
                WHERE op.phase_id = pp.id
                  AND op.project_id = p_project_id
                ORDER BY op.display_order
              ) op_data
            ),
            '[]'::jsonb
          )
        ) as phase_obj
      FROM public.project_phases pp
      WHERE pp.project_id = p_project_id
        AND pp.is_standard = false
      ORDER BY pp.display_order
    ) phase_data
  );
  
  -- Merge: standard phases (from Standard Project Foundation) + custom phases (from template)
  -- Standard phases are copied fresh with all their step content at the same time as custom phases
  workflow_json := COALESCE(standard_phases_json, '[]'::jsonb) || COALESCE(custom_phases_json, '[]'::jsonb);
  
  RETURN COALESCE(workflow_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- IMPORTANT: create_project_run_snapshot should use this function
-- ============================================
-- The create_project_run_snapshot function should use get_project_workflow_with_standards
-- to get the complete workflow (including standard phases) before creating the snapshot.
-- 
-- This ensures that:
-- 1. Standard phases are always copied from Standard Project Foundation (not from templates)
-- 2. Standard phase step content is copied at the same time as custom phases
-- 3. Project runs have complete, independent copies of all phases for progress tracking

