-- Update rebuild_phases_json_from_project_phases to default step skill_level to project skill_level
-- when creating project runs, if step skill_level is NULL

CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(
  p_project_id UUID,
  p_default_skill_level TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  phases_json JSONB := '[]'::jsonb;
  phase_record RECORD;
  operations_json JSONB;
  operation_record RECORD;
  effective_operation_id UUID;
  steps_json JSONB;
  step_obj JSONB;
  step_record RECORD;
  apps_json JSONB;
  app_obj JSONB;
  app_override RECORD;
  phase_count INTEGER := 0;
  total_operations INTEGER := 0;
  project_skill_level TEXT;
BEGIN
  -- Get project skill level if not provided
  IF p_default_skill_level IS NULL THEN
    SELECT skill_level INTO project_skill_level
    FROM public.projects
    WHERE id = p_project_id;
    p_default_skill_level := project_skill_level;
  END IF;

  -- Debug: Count phases
  SELECT COUNT(*) INTO phase_count
  FROM public.project_phases
  WHERE project_id = p_project_id;

  RAISE NOTICE '🔍 rebuild_phases_json_from_project_phases: project_id=%, phase_count=%, default_skill_level=%', 
    p_project_id, phase_count, p_default_skill_level;

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
      steps_json := public.get_operation_steps_json(
        effective_operation_id,
        COALESCE(operation_record.is_reference, false)
      );

      -- Update each step's skill_level if it's NULL, defaulting to project skill_level
      IF p_default_skill_level IS NOT NULL AND steps_json IS NOT NULL AND jsonb_array_length(steps_json) > 0 THEN
        -- Rebuild steps_json with updated skill levels
        steps_json := (
          SELECT jsonb_agg(
            CASE 
              WHEN step_elem->>'skillLevel' IS NULL OR step_elem->>'skillLevel' = 'null' OR step_elem->>'skillLevel' = ''
              THEN jsonb_set(step_elem, '{skillLevel}', to_jsonb(p_default_skill_level))
              ELSE step_elem
            END
          )
          FROM jsonb_array_elements(steps_json) AS step_elem
        );
      END IF;

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

