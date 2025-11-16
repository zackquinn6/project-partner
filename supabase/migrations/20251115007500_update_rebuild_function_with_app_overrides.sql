-- Update rebuild_phases_json_from_project_phases to use app overrides
-- This ensures project templates always show the latest app names

CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  phases_json JSONB := '[]'::jsonb;
  phase_record RECORD;
  operations_json JSONB;
  operation_record RECORD;
  effective_operation_id UUID;
  steps_json JSONB;
  step_record RECORD;
  apps_json JSONB;
  app_obj JSONB;
  app_override RECORD;
  phase_count INTEGER := 0;
  total_operations INTEGER := 0;
BEGIN
  -- Debug: Count phases
  SELECT COUNT(*) INTO phase_count
  FROM public.project_phases
  WHERE project_id = p_project_id;

  RAISE NOTICE '🔍 rebuild_phases_json_from_project_phases: project_id=%, phase_count=%', p_project_id, phase_count;

  FOR phase_record IN
    SELECT *
    FROM public.project_phases
    WHERE project_id = p_project_id
    ORDER BY display_order
  LOOP
    operations_json := '[]'::jsonb;

    -- NORMALIZED: All operations use phase_id, no need to check standard_phase_id
    FOR operation_record IN
      SELECT DISTINCT op.*,
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
      total_operations := total_operations + 1;

      -- For reference operations, use source operation ID to get steps
      effective_operation_id := COALESCE(operation_record.source_operation_id, operation_record.id);

      -- Get steps from the effective operation (source if reference, self if not)
      -- This function will apply app overrides automatically
      steps_json := public.get_operation_steps_json(
        effective_operation_id,
        COALESCE(operation_record.is_reference, false)
      );

      -- CRITICAL FIX: Wrap object in array, then concatenate arrays
      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', operation_record.id,
          'name', COALESCE(operation_record.name, operation_record.source_name),
          'description', COALESCE(operation_record.description, operation_record.source_description),
          'flowType', COALESCE(operation_record.flow_type, operation_record.source_flow_type, 'prime'),
          'userPrompt', COALESCE(operation_record.user_prompt, operation_record.source_user_prompt),
          'alternateGroup', COALESCE(operation_record.alternate_group, operation_record.source_alternate_group),
          'steps', COALESCE(steps_json, '[]'::jsonb),
          'isStandard', COALESCE(operation_record.is_reference, false) OR phase_record.is_standard,
          'sourceOperationId', operation_record.source_operation_id
        )
      );
    END LOOP;

    RAISE NOTICE '🔍 Phase: % - Added % operations', phase_record.name, jsonb_array_length(operations_json);

    -- CRITICAL FIX: Wrap object in array, then concatenate arrays
    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', phase_record.is_standard
      )
    );
  END LOOP;

  RAISE NOTICE '✅ rebuild_phases_json_from_project_phases: project_id=%, total_phases=%, total_operations=%', 
    p_project_id, phase_count, total_operations;

  RETURN phases_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

