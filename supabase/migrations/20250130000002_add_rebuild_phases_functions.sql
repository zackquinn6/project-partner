-- Add missing rebuild_phases_json_from_project_phases and get_operation_steps_json functions
-- These functions are required to rebuild phases JSON from relational tables when needed

-- ============================================
-- STEP 1: Create get_operation_steps_json function (if it doesn't exist)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_operation_steps_json(
  p_operation_id UUID,
  p_is_reference BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  steps_json JSONB := '[]'::jsonb;
  step_record RECORD;
BEGIN
  -- Get all steps for this operation, ordered by display_order
  FOR step_record IN
    SELECT 
      id,
      operation_id,
      step_title,
      description,
      display_order,
      step_number,
      flow_type,
      step_type,
      content_sections,
      materials,
      tools,
      outputs,
      apps,
      estimated_time_minutes
    FROM public.template_steps
    WHERE operation_id = p_operation_id
    ORDER BY display_order, step_number
  LOOP
    steps_json := steps_json || jsonb_build_array(
      jsonb_build_object(
        'id', step_record.id,
        'step', step_record.step_title,
        'description', step_record.description,
        'stepNumber', step_record.step_number,
        'displayOrder', step_record.display_order,
        'flowType', COALESCE(step_record.flow_type, 'prime'),
        'stepType', COALESCE(step_record.step_type, 'prime'),
        'content', COALESCE(step_record.content_sections, '[]'::jsonb),
        'materials', COALESCE(step_record.materials, '[]'::jsonb),
        'tools', COALESCE(step_record.tools, '[]'::jsonb),
        'outputs', COALESCE(step_record.outputs, '[]'::jsonb),
        'apps', COALESCE(step_record.apps, '[]'::jsonb),
        'timeEstimation', CASE 
          WHEN step_record.estimated_time_minutes IS NOT NULL THEN
            jsonb_build_object('fixedTime', step_record.estimated_time_minutes)
          ELSE NULL
        END
      )
    );
  END LOOP;

  RETURN steps_json;
END;
$$;

COMMENT ON FUNCTION public.get_operation_steps_json IS 
'Returns JSONB array of steps for a given operation, ordered by display_order. Used by rebuild_phases_json_from_project_phases.';

-- ============================================
-- STEP 2: Create rebuild_phases_json_from_project_phases function
-- This function rebuilds the phases JSONB from relational tables (project_phases, template_operations, template_steps)
-- It includes BOTH standard and custom phases
-- ============================================
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(
  p_project_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  phases_json JSONB := '[]'::jsonb;
  phase_record RECORD;
  operations_json JSONB;
  operation_record RECORD;
  effective_operation_id UUID;
  steps_json JSONB;
BEGIN
  -- Loop through ALL phases for this project (both standard and custom)
  -- They are all stored in project_phases table
  FOR phase_record IN
    SELECT 
      id,
      project_id,
      name,
      description,
      display_order,
      is_standard,
      standard_phase_id
    FROM public.project_phases
    WHERE project_id = p_project_id
    ORDER BY display_order
  LOOP
    operations_json := '[]'::jsonb;

    -- Get all operations for this phase
    FOR operation_record IN
      SELECT DISTINCT
        op.id,
        op.project_id,
        op.phase_id,
        op.name,
        op.description,
        op.flow_type,
        op.user_prompt,
        op.alternate_group,
        op.display_order,
        op.is_standard_phase,
        op.source_operation_id,
        op.is_reference,
        src.name AS source_name,
        src.description AS source_description,
        src.flow_type AS source_flow_type,
        src.user_prompt AS source_user_prompt,
        src.alternate_group AS source_alternate_group
      FROM public.template_operations op
      LEFT JOIN public.template_operations src ON op.source_operation_id = src.id
      WHERE op.project_id = p_project_id
        AND op.phase_id = phase_record.id
      ORDER BY op.display_order
    LOOP
      -- For reference operations, use source operation ID to get steps
      effective_operation_id := COALESCE(operation_record.source_operation_id, operation_record.id);

      -- Get steps from the effective operation (source if reference, self if not)
      steps_json := public.get_operation_steps_json(
        effective_operation_id,
        COALESCE(operation_record.is_reference, false)
      );

      -- Build operation JSON object
      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', operation_record.id,
          'name', COALESCE(operation_record.name, operation_record.source_name),
          'description', COALESCE(operation_record.description, operation_record.source_description),
          'flowType', COALESCE(operation_record.flow_type, operation_record.source_flow_type, 'prime'),
          'userPrompt', COALESCE(operation_record.user_prompt, operation_record.source_user_prompt),
          'alternateGroup', COALESCE(operation_record.alternate_group, operation_record.source_alternate_group),
          'steps', COALESCE(steps_json, '[]'::jsonb),
          'isStandard', COALESCE(operation_record.is_reference, false) OR COALESCE(phase_record.is_standard, false),
          'sourceOperationId', operation_record.source_operation_id
        )
      );
    END LOOP;

    -- Build phase JSON object
    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', COALESCE(phase_record.is_standard, false)
      )
    );
  END LOOP;

  RETURN phases_json;
END;
$$;

COMMENT ON FUNCTION public.rebuild_phases_json_from_project_phases IS 
'Rebuilds phases JSONB from relational tables (project_phases, template_operations, template_steps). Includes BOTH standard and custom phases. Used when template phases JSONB is empty or invalid.';

