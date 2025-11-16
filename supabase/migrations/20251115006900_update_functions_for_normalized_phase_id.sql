-- UPDATE FUNCTIONS FOR NORMALIZED PHASE ID
-- Update all functions to use phase_id instead of standard_phase_id from template_operations
-- Use project_phases.is_standard to determine if phase is standard

-- 1. Update rebuild_phases_json_from_project_phases to use phase_id only
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  phases_json JSONB := '[]'::jsonb;
  phase_record RECORD;
  operations_json JSONB;
  operation_record RECORD;
  effective_operation_id UUID;
  steps_json JSONB;
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

-- 2. Update create_project_with_standard_foundation_v2 to use phase_id only
CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  p_project_name TEXT,
  p_project_description TEXT,
  p_category TEXT DEFAULT 'general',
  p_created_by UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  std_phase RECORD;
  new_phase_id UUID;
  std_operation RECORD;
BEGIN
  INSERT INTO public.projects (
    name,
    description,
    category,
    publish_status,
    created_by,
    is_current_version
  ) VALUES (
    p_project_name,
    p_project_description,
    p_category,
    'draft',
    p_created_by,
    true
  ) RETURNING id INTO new_project_id;

  FOR std_phase IN
    SELECT pp.*, sp.id AS standard_phase_lookup
    FROM public.project_phases pp
    JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
    WHERE pp.project_id = standard_project_id
    ORDER BY pp.display_order
  LOOP
    INSERT INTO public.project_phases (
      project_id,
      name,
      description,
      display_order,
      is_standard,
      standard_phase_id
    ) VALUES (
      new_project_id,
      std_phase.name,
      std_phase.description,
      std_phase.display_order,
      true,
      std_phase.standard_phase_id
    ) RETURNING id INTO new_phase_id;

    FOR std_operation IN
      SELECT *
      FROM public.template_operations
      WHERE project_id = standard_project_id
        AND phase_id = std_phase.id
      ORDER BY display_order
    LOOP
      INSERT INTO public.template_operations (
        project_id,
        phase_id,
        name,
        description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        is_standard_phase,
        source_operation_id,
        is_reference
      ) VALUES (
        new_project_id,
        new_phase_id,
        std_operation.name,
        std_operation.description,
        std_operation.flow_type,
        std_operation.user_prompt,
        std_operation.alternate_group,
        std_operation.display_order,
        true,
        std_operation.id,
        true
      );
    END LOOP;
  END LOOP;

  -- Rebuild phases JSON
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(new_project_id)
  WHERE id = new_project_id;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

