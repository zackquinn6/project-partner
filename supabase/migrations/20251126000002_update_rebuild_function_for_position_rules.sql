-- Update rebuild_phases_json_from_project_phases to use position_rule/position_value instead of display_order
-- Migration: 20251126000002_update_rebuild_function_for_position_rules.sql
--
-- This migration updates the rebuild function to order phases by position_rule and position_value
-- instead of display_order.

CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  phases_json JSONB := '[]'::jsonb;
  phase_record RECORD;
  operations_json JSONB;
  operation_record RECORD;
  effective_operation_id UUID;
  steps_json JSONB;
BEGIN
  -- Order phases by position rules:
  -- 1. 'first' phases first
  -- 2. 'nth' phases by position_value
  -- 3. 'last_minus_n' phases (ordered by position_value descending, so smaller values come later)
  -- 4. 'last' phases last
  -- 5. NULL position_rule phases (custom phases) by created_at
  FOR phase_record IN
    SELECT 
      id,
      project_id,
      name,
      description,
      position_rule,
      position_value,
      is_standard,
      standard_phase_id,
      created_at
    FROM public.project_phases
    WHERE project_id = p_project_id
    ORDER BY 
      CASE 
        WHEN position_rule = 'first' THEN 1
        WHEN position_rule = 'nth' THEN 2
        WHEN position_rule = 'last_minus_n' THEN 3
        WHEN position_rule = 'last' THEN 4
        ELSE 5  -- NULL position_rule (custom phases)
      END,
      CASE 
        WHEN position_rule = 'nth' THEN position_value
        WHEN position_rule = 'last_minus_n' THEN -position_value  -- Negative for descending order
        ELSE NULL
      END NULLS LAST,
      created_at  -- For custom phases (NULL position_rule), order by creation time
  LOOP
    operations_json := '[]'::jsonb;

    -- Operations are ordered by their position in the operations array within each phase
    -- Since operations don't have position_rule/position_value, we order by created_at
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
        op.is_standard_phase,
        op.source_operation_id,
        op.is_reference,
        op.created_at,
        src.name AS source_name,
        src.description AS source_description,
        src.flow_type AS source_flow_type,
        src.user_prompt AS source_user_prompt,
        src.alternate_group AS source_alternate_group
      FROM public.template_operations op
      LEFT JOIN public.template_operations src ON op.source_operation_id = src.id
      WHERE op.project_id = p_project_id
        AND op.phase_id = phase_record.id
      ORDER BY op.created_at
    LOOP
      effective_operation_id := COALESCE(operation_record.source_operation_id, operation_record.id);

      steps_json := public.get_operation_steps_json(
        effective_operation_id,
        COALESCE(operation_record.is_reference, false)
      );

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

    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'positionRule', phase_record.position_rule,
        'positionValue', phase_record.position_value,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', phase_record.is_standard
      )
    );
  END LOOP;

  RETURN phases_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.rebuild_phases_json_from_project_phases IS 
'Rebuilds phases JSON from relational data, ordering by position_rule and position_value.
Order: first -> nth -> last_minus_n -> last -> NULL (custom phases by created_at).';

