-- Update rebuild_phases_json_from_templates to include flow_type and dependent_on at operation level
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_templates(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result_phases jsonb := '[]'::jsonb;
  phase_record record;
  operation_record record;
  step_record record;
  phase_obj jsonb;
  operations_array jsonb;
  operation_obj jsonb;
  steps_array jsonb;
  step_obj jsonb;
BEGIN
  -- Get all unique phases (via standard_phase_id) for this project
  FOR phase_record IN
    SELECT DISTINCT 
      sp.id as phase_id,
      sp.name as phase_name,
      sp.description as phase_description,
      sp.display_order
    FROM template_operations toper
    JOIN standard_phases sp ON sp.id = toper.standard_phase_id
    WHERE toper.project_id = p_project_id
    ORDER BY sp.display_order
  LOOP
    -- Initialize operations array for this phase
    operations_array := '[]'::jsonb;
    
    -- Get all operations for this phase INCLUDING all flow metadata
    FOR operation_record IN
      SELECT 
        toper.id as operation_id,
        toper.name as operation_name,
        toper.description as operation_description,
        toper.display_order,
        toper.flow_type,
        toper.user_prompt,
        toper.alternate_group,
        toper.dependent_on
      FROM template_operations toper
      WHERE toper.project_id = p_project_id
        AND toper.standard_phase_id = phase_record.phase_id
      ORDER BY toper.display_order
    LOOP
      -- Initialize steps array for this operation
      steps_array := '[]'::jsonb;
      
      -- Get all steps for this operation INCLUDING flow_type
      FOR step_record IN
        SELECT 
          ts.id,
          ts.step_number,
          ts.step_title,
          ts.description,
          ts.content_sections,
          ts.materials,
          ts.tools,
          ts.outputs,
          ts.apps,
          ts.estimated_time_minutes,
          ts.flow_type
        FROM template_steps ts
        WHERE ts.operation_id = operation_record.operation_id
        ORDER BY ts.display_order
      LOOP
        -- Build step object (INCLUDING flowType)
        step_obj := jsonb_build_object(
          'id', step_record.id::text,
          'step', step_record.step_title,
          'description', COALESCE(step_record.description, ''),
          'content', step_record.content_sections,
          'contentType', 'multi',
          'materials', COALESCE(step_record.materials, '[]'::jsonb),
          'tools', COALESCE(step_record.tools, '[]'::jsonb),
          'outputs', COALESCE(step_record.outputs, '[]'::jsonb),
          'apps', COALESCE(step_record.apps, '[]'::jsonb),
          'estimatedTime', COALESCE(step_record.estimated_time_minutes, 0),
          'flowType', COALESCE(step_record.flow_type, 'prime')
        );
        
        -- Add step to steps array
        steps_array := steps_array || step_obj;
      END LOOP;
      
      -- Build operation object with ALL flow metadata
      operation_obj := jsonb_build_object(
        'id', operation_record.operation_id::text,
        'name', operation_record.operation_name,
        'description', COALESCE(operation_record.operation_description, ''),
        'steps', steps_array,
        'flowType', COALESCE(operation_record.flow_type, 'prime')
      );
      
      -- Add optional flow metadata if present
      IF operation_record.user_prompt IS NOT NULL THEN
        operation_obj := operation_obj || jsonb_build_object('userPrompt', operation_record.user_prompt);
      END IF;
      
      IF operation_record.alternate_group IS NOT NULL THEN
        operation_obj := operation_obj || jsonb_build_object('alternateGroup', operation_record.alternate_group);
      END IF;
      
      IF operation_record.dependent_on IS NOT NULL THEN
        operation_obj := operation_obj || jsonb_build_object('dependentOn', operation_record.dependent_on::text);
      END IF;
      
      -- Add operation to operations array
      operations_array := operations_array || operation_obj;
    END LOOP;
    
    -- Build phase object
    phase_obj := jsonb_build_object(
      'id', phase_record.phase_id::text,
      'name', phase_record.phase_name,
      'description', COALESCE(phase_record.phase_description, ''),
      'operations', operations_array
    );
    
    -- Add phase to result
    result_phases := result_phases || phase_obj;
  END LOOP;
  
  RETURN result_phases;
END;
$function$;