-- Normalize rebuild_phases_json_from_templates to use phase_id instead of the removed standard_phase_id
-- This prevents App Manager overrides from failing when template_steps updates trigger phase rebuilds.

DROP FUNCTION IF EXISTS public.rebuild_phases_json_from_templates(uuid);

CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_templates(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phases_json jsonb := '[]'::jsonb;
  phase_record RECORD;
  operations_json jsonb;
  operation_record RECORD;
  steps_json jsonb;
  step_record RECORD;
  orphan_phase_name TEXT;
BEGIN
  -- Primary path: use normalized project_phases linked via phase_id
  FOR phase_record IN
    SELECT id, name, description, display_order, is_standard
    FROM public.project_phases
    WHERE project_id = p_project_id
    ORDER BY display_order
  LOOP
    operations_json := '[]'::jsonb;

    FOR operation_record IN
      SELECT *
      FROM public.template_operations
      WHERE project_id = p_project_id
        AND phase_id = phase_record.id
      ORDER BY display_order
    LOOP
      steps_json := '[]'::jsonb;

      FOR step_record IN
        SELECT *
        FROM public.template_steps
        WHERE operation_id = operation_record.id
        ORDER BY step_number
      LOOP
        steps_json := steps_json || jsonb_build_array(
          jsonb_build_object(
            'id', step_record.id,
            'step', step_record.step_title,
            'description', step_record.description,
            'stepNumber', step_record.step_number,
            'operationId', step_record.operation_id,
            'estimatedTimeMinutes', step_record.estimated_time_minutes,
            'content_sections', COALESCE(step_record.content_sections, '[]'::jsonb),
            'materials', COALESCE(step_record.materials, '[]'::jsonb),
            'tools', COALESCE(step_record.tools, '[]'::jsonb),
            'outputs', COALESCE(step_record.outputs, '[]'::jsonb),
            'apps', COALESCE(step_record.apps, '[]'::jsonb),
            'flowType', step_record.flow_type,
            'stepType', step_record.step_type
          )
        );
      END LOOP;

      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', operation_record.id,
          'name', operation_record.name,
          'description', operation_record.description,
          'flowType', operation_record.flow_type,
          'userPrompt', operation_record.user_prompt,
          'alternateGroup', operation_record.alternate_group,
          'dependentOn', operation_record.dependent_on,
          'steps', steps_json
        )
      );
    END LOOP;

    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'isStandard', phase_record.is_standard,
        'operations', operations_json
      )
    );
  END LOOP;

  -- Fallback: include any operations that lost their phase reference
  FOR phase_record IN
    SELECT 
      COALESCE(custom_phase_name, 'Unassigned Phase') AS name,
      COALESCE(custom_phase_description, 'Operations awaiting phase assignment') AS description,
      COALESCE(custom_phase_display_order, 999) AS display_order
    FROM public.template_operations
    WHERE project_id = p_project_id
      AND phase_id IS NULL
    GROUP BY 1,2,3
    ORDER BY 3
  LOOP
    operations_json := '[]'::jsonb;

    FOR operation_record IN
      SELECT *
      FROM public.template_operations
      WHERE project_id = p_project_id
        AND phase_id IS NULL
        AND COALESCE(custom_phase_name, 'Unassigned Phase') = phase_record.name
      ORDER BY COALESCE(custom_phase_display_order, display_order, 999)
    LOOP
      steps_json := '[]'::jsonb;

      FOR step_record IN
        SELECT *
        FROM public.template_steps
        WHERE operation_id = operation_record.id
        ORDER BY step_number
      LOOP
        steps_json := steps_json || jsonb_build_array(
          jsonb_build_object(
            'id', step_record.id,
            'step', step_record.step_title,
            'description', step_record.description,
            'stepNumber', step_record.step_number,
            'operationId', step_record.operation_id,
            'estimatedTimeMinutes', step_record.estimated_time_minutes,
            'content_sections', COALESCE(step_record.content_sections, '[]'::jsonb),
            'materials', COALESCE(step_record.materials, '[]'::jsonb),
            'tools', COALESCE(step_record.tools, '[]'::jsonb),
            'outputs', COALESCE(step_record.outputs, '[]'::jsonb),
            'apps', COALESCE(step_record.apps, '[]'::jsonb),
            'flowType', step_record.flow_type,
            'stepType', step_record.step_type
          )
        );
      END LOOP;

      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', operation_record.id,
          'name', operation_record.name,
          'description', operation_record.description,
          'flowType', operation_record.flow_type,
          'userPrompt', operation_record.user_prompt,
          'alternateGroup', operation_record.alternate_group,
          'dependentOn', operation_record.dependent_on,
          'steps', steps_json
        )
      );
    END LOOP;

    IF jsonb_array_length(operations_json) > 0 THEN
      phases_json := phases_json || jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid(),
          'name', phase_record.name,
          'description', phase_record.description,
          'isStandard', false,
          'operations', operations_json
        )
      );
    END IF;
  END LOOP;

  RETURN phases_json;
END;
$$;

