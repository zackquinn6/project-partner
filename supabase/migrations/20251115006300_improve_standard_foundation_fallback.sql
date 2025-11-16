-- IMPROVE STANDARD FOUNDATION FALLBACK
-- The fallback wasn't finding operations because it only checked phase_id matching
-- Now it also checks standard_phase_id directly

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
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
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

    -- FIX: Check operations by phase_id OR by standard_phase_id if phase is standard
    -- Also fallback to standard foundation project if no operations found
    -- IMPROVED: Fallback now checks both phase_id AND standard_phase_id matching
    FOR operation_record IN
      SELECT DISTINCT ON (op.id) op.*,
             src.name AS source_name,
             src.description AS source_description,
             src.flow_type AS source_flow_type,
             src.user_prompt AS source_user_prompt,
             src.alternate_group AS source_alternate_group
      FROM public.template_operations op
      LEFT JOIN public.template_operations src ON op.source_operation_id = src.id
      WHERE (
        -- First try: operations for this project
        (op.project_id = p_project_id
         AND (
           -- Match by phase_id (direct link)
           op.phase_id = phase_record.id
           OR
           -- Match by standard_phase_id if this phase is standard
           (phase_record.is_standard = true 
            AND phase_record.standard_phase_id IS NOT NULL
            AND op.standard_phase_id = phase_record.standard_phase_id
            AND op.phase_id IS NULL)
         ))
        OR
        -- Fallback: operations from standard foundation if phase is standard and no operations found
        (phase_record.is_standard = true
         AND phase_record.standard_phase_id IS NOT NULL
         AND op.project_id = standard_project_id
         AND (
           -- Match by phase_id (if standard foundation has phases with matching standard_phase_id)
           op.phase_id IN (
             SELECT pp.id FROM public.project_phases pp
             WHERE pp.project_id = standard_project_id
               AND pp.standard_phase_id = phase_record.standard_phase_id
           )
           OR
           -- Match by standard_phase_id directly (if operations are linked via standard_phase_id)
           op.standard_phase_id = phase_record.standard_phase_id
         )
         AND NOT EXISTS (
           -- Don't include if this project already has this operation
           SELECT 1 FROM public.template_operations existing
           WHERE existing.project_id = p_project_id
             AND (
               existing.phase_id = phase_record.id
               OR (existing.standard_phase_id = phase_record.standard_phase_id AND existing.name = op.name)
             )
         ))
      )
      ORDER BY op.id, op.display_order
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

