-- Fix rebuild_phases_json_from_templates to filter out phase marker operations
-- Phase markers are used to create empty custom phases and should not appear in the phase operations

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
  operation_record RECORD;
  step_record RECORD;
  phase_obj jsonb;
  operation_obj jsonb;
  step_obj jsonb;
  operations_array jsonb;
  steps_array jsonb;
BEGIN
  -- First, handle STANDARD phases
  FOR phase_record IN
    SELECT DISTINCT
      sp.id,
      sp.name,
      sp.description,
      sp.display_order,
      true as is_standard
    FROM standard_phases sp
    INNER JOIN template_operations top ON top.standard_phase_id = sp.id
    WHERE top.project_id = p_project_id
      AND top.name != '__PHASE_MARKER__'  -- Exclude phase markers
    ORDER BY sp.display_order
  LOOP
    operations_array := '[]'::jsonb;
    
    -- Get operations for this standard phase (exclude markers)
    FOR operation_record IN
      SELECT
        top.id,
        top.name,
        top.description,
        top.display_order,
        top.flow_type,
        top.user_prompt,
        top.alternate_group,
        top.dependent_on
      FROM template_operations top
      WHERE top.standard_phase_id = phase_record.id
        AND top.project_id = p_project_id
        AND top.name != '__PHASE_MARKER__'
      ORDER BY top.display_order
    LOOP
      steps_array := '[]'::jsonb;
      
      -- Get steps for this operation
      FOR step_record IN
        SELECT
          ts.id,
          ts.step_title,
          ts.description,
          ts.step_number,
          ts.operation_id,
          ts.estimated_time_minutes,
          ts.content_sections,
          ts.materials,
          ts.tools,
          ts.outputs,
          ts.apps,
          ts.flow_type,
          ts.step_type
        FROM template_steps ts
        WHERE ts.operation_id = operation_record.id
        ORDER BY ts.step_number
      LOOP
        step_obj := jsonb_build_object(
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
        );
        
        steps_array := steps_array || jsonb_build_array(step_obj);
      END LOOP;
      
      operation_obj := jsonb_build_object(
        'id', operation_record.id,
        'name', operation_record.name,
        'description', operation_record.description,
        'flowType', operation_record.flow_type,
        'userPrompt', operation_record.user_prompt,
        'alternateGroup', operation_record.alternate_group,
        'dependentOn', operation_record.dependent_on,
        'steps', steps_array
      );
      
      operations_array := operations_array || jsonb_build_array(operation_obj);
    END LOOP;
    
    phase_obj := jsonb_build_object(
      'id', phase_record.id,
      'name', phase_record.name,
      'description', phase_record.description,
      'isStandard', true,
      'operations', operations_array
    );
    
    phases_json := phases_json || jsonb_build_array(phase_obj);
  END LOOP;
  
  -- Second, handle CUSTOM phases
  FOR phase_record IN
    SELECT DISTINCT
      gen_random_uuid() as id,  -- Generate unique ID for custom phase
      custom_phase_name as name,
      custom_phase_description as description,
      custom_phase_display_order as display_order,
      false as is_standard
    FROM template_operations
    WHERE project_id = p_project_id
      AND is_custom_phase = true
      AND custom_phase_name IS NOT NULL
    ORDER BY custom_phase_display_order
  LOOP
    operations_array := '[]'::jsonb;
    
    -- Get operations for this custom phase (exclude markers)
    FOR operation_record IN
      SELECT
        top.id,
        top.name,
        top.description,
        top.display_order,
        top.flow_type,
        top.user_prompt,
        top.alternate_group,
        top.dependent_on
      FROM template_operations top
      WHERE top.custom_phase_name = phase_record.name
        AND top.project_id = p_project_id
        AND top.is_custom_phase = true
        AND top.name != '__PHASE_MARKER__'
      ORDER BY top.display_order
    LOOP
      steps_array := '[]'::jsonb;
      
      -- Get steps for this operation
      FOR step_record IN
        SELECT
          ts.id,
          ts.step_title,
          ts.description,
          ts.step_number,
          ts.operation_id,
          ts.estimated_time_minutes,
          ts.content_sections,
          ts.materials,
          ts.tools,
          ts.outputs,
          ts.apps,
          ts.flow_type,
          ts.step_type
        FROM template_steps ts
        WHERE ts.operation_id = operation_record.id
        ORDER BY ts.step_number
      LOOP
        step_obj := jsonb_build_object(
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
        );
        
        steps_array := steps_array || jsonb_build_array(step_obj);
      END LOOP;
      
      operation_obj := jsonb_build_object(
        'id', operation_record.id,
        'name', operation_record.name,
        'description', operation_record.description,
        'flowType', operation_record.flow_type,
        'userPrompt', operation_record.user_prompt,
        'alternateGroup', operation_record.alternate_group,
        'dependentOn', operation_record.dependent_on,
        'steps', steps_array
      );
      
      operations_array := operations_array || jsonb_build_array(operation_obj);
    END LOOP;
    
    -- Only create phase object if it has operations OR if we want to show empty custom phases
    phase_obj := jsonb_build_object(
      'id', phase_record.id,
      'name', phase_record.name,
      'description', phase_record.description,
      'isStandard', false,
      'operations', operations_array
    );
    
    phases_json := phases_json || jsonb_build_array(phase_obj);
  END LOOP;
  
  RETURN phases_json;
END;
$$;