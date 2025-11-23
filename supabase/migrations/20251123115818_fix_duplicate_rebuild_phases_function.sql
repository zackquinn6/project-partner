-- Fix: Remove duplicate rebuild_phases_json_from_project_phases functions
-- The error "function rebuild_phases_json_from_project_phases(uuid) is not unique" 
-- occurs because there are multiple versions with different signatures
-- This migration removes conflicting single-parameter versions and ensures a single clean version

-- Drop only the single-parameter versions that cause ambiguity
-- Keep the two-parameter version since views depend on it
DROP FUNCTION IF EXISTS public.rebuild_phases_json_from_project_phases(UUID);
DROP FUNCTION IF EXISTS public.rebuild_phases_json_from_project_phases(p_project_id UUID);

-- Create a single clean version with the most recent implementation
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(
  p_project_id UUID,
  p_default_skill_level TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  phases_json JSONB := '[]'::jsonb;
  operations_json JSONB;
  steps_json JSONB;
  total_phases INTEGER := 0;
  total_operations INTEGER := 0;
  project_skill_level TEXT;
  standard_project_id UUID := '00000000-0000-0000-0000-000000000001';
  phase_record RECORD;
  operation_record RECORD;
  effective_operation_id UUID;
  standard_phase_record RECORD;
  phase_seen JSONB := '{}'::jsonb;
BEGIN
  -- Get project skill level if not provided
  IF p_default_skill_level IS NULL THEN
    SELECT skill_level INTO project_skill_level
    FROM public.projects
    WHERE id = p_project_id;
    
    p_default_skill_level := COALESCE(project_skill_level, 'Beginner');
  END IF;

  -- CRITICAL: If this is NOT the Standard Project Foundation, dynamically include ALL standard phases
  -- from Standard Project Foundation that have is_standard: true
  IF p_project_id != standard_project_id THEN
    FOR standard_phase_record IN
      SELECT *
      FROM public.project_phases
      WHERE project_id = standard_project_id
        AND is_standard = true
      ORDER BY display_order
    LOOP
      -- Check if this standard phase already exists in the project's phases
      -- If not, we need to include it dynamically
      IF NOT EXISTS (
        SELECT 1
        FROM public.project_phases
        WHERE project_id = p_project_id
          AND standard_phase_id = standard_phase_record.standard_phase_id
      ) THEN
        -- This standard phase doesn't exist in the project - include it dynamically
        -- Mark it as seen so we don't duplicate it
        phase_seen := phase_seen || jsonb_build_object(standard_phase_record.id::text, true);
        
        operations_json := '[]'::jsonb;
        
        -- Get operations from Standard Project Foundation for this phase
        FOR operation_record IN
          SELECT DISTINCT op.*,
                 src.name AS source_name,
                 src.description AS source_description,
                 src.flow_type AS source_flow_type,
                 src.user_prompt AS source_user_prompt,
                 src.alternate_group AS source_alternate_group
          FROM public.template_operations op
          LEFT JOIN public.template_operations src ON op.source_operation_id = src.id
          WHERE op.project_id = standard_project_id
            AND op.phase_id = standard_phase_record.id
          ORDER BY op.display_order
        LOOP
          total_operations := total_operations + 1;
          
          effective_operation_id := COALESCE(operation_record.source_operation_id, operation_record.id);
          
          steps_json := public.get_operation_steps_json(
            effective_operation_id,
            COALESCE(operation_record.is_reference, false)
          );
          
          -- Update skill levels if needed
          IF p_default_skill_level IS NOT NULL AND steps_json IS NOT NULL AND jsonb_array_length(steps_json) > 0 THEN
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
          
          operations_json := operations_json || jsonb_build_array(
            jsonb_build_object(
              'id', operation_record.id,
              'name', COALESCE(operation_record.name, operation_record.source_name),
              'description', COALESCE(operation_record.description, operation_record.source_description),
              'flowType', COALESCE(operation_record.flow_type, operation_record.source_flow_type, 'prime'),
              'userPrompt', COALESCE(operation_record.user_prompt, operation_record.source_user_prompt),
              'alternateGroup', COALESCE(operation_record.alternate_group, operation_record.source_alternate_group),
              'steps', COALESCE(steps_json, '[]'::jsonb),
              'isStandard', true,
              'sourceOperationId', operation_record.source_operation_id
            )
          );
        END LOOP;
        
        -- Add the standard phase from Standard Project Foundation
        -- Since we're in the "IF NOT EXISTS" block, this phase doesn't exist in project_phases,
        -- so it's being dynamically included and isLinked should be false
        phases_json := phases_json || jsonb_build_array(
          jsonb_build_object(
            'id', standard_phase_record.id,
            'name', standard_phase_record.name,
            'description', standard_phase_record.description,
            'operations', COALESCE(operations_json, '[]'::jsonb),
            'isStandard', true,
            'isLinked', false
          )
        );
      END IF;
    END LOOP;
  END IF;

  -- Now process the project's own phases
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

      -- Update skill levels if needed
      IF p_default_skill_level IS NOT NULL AND steps_json IS NOT NULL AND jsonb_array_length(steps_json) > 0 THEN
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
    -- Note: is_linked is not a column in project_phases table - it only exists in JSON
    -- Phases from project_phases table are never "linked" (incorporated), so isLinked is always false
    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', phase_record.is_standard,
        'isLinked', false
      )
    );
  END LOOP;

  RAISE NOTICE '✅ rebuild_phases_json_from_project_phases: project_id=%, total_phases=%, total_operations=%', 
    p_project_id, jsonb_array_length(phases_json), total_operations;

  RETURN phases_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rebuild_phases_json_from_project_phases(UUID, TEXT) IS 'Rebuilds phases JSON from relational project_phases table, dynamically including standard phases from Standard Project Foundation. Single unified version to prevent function ambiguity errors.';

