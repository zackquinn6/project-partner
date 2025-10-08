-- Add apps column to template_steps to store AppReference[]
ALTER TABLE public.template_steps
ADD COLUMN IF NOT EXISTS apps jsonb DEFAULT '[]'::jsonb;

-- Update rebuild_phases_json_from_templates to include apps
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_templates(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    
    -- Get all operations for this phase
    FOR operation_record IN
      SELECT 
        toper.id as operation_id,
        toper.name as operation_name,
        toper.description as operation_description,
        toper.display_order
      FROM template_operations toper
      WHERE toper.project_id = p_project_id
        AND toper.standard_phase_id = phase_record.phase_id
      ORDER BY toper.display_order
    LOOP
      -- Initialize steps array for this operation
      steps_array := '[]'::jsonb;
      
      -- Get all steps for this operation
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
          ts.estimated_time_minutes
        FROM template_steps ts
        WHERE ts.operation_id = operation_record.operation_id
        ORDER BY ts.display_order
      LOOP
        -- Build step object (INCLUDING apps)
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
          'estimatedTime', COALESCE(step_record.estimated_time_minutes, 0)
        );
        
        -- Add step to steps array
        steps_array := steps_array || step_obj;
      END LOOP;
      
      -- Build operation object
      operation_obj := jsonb_build_object(
        'id', operation_record.operation_id::text,
        'name', operation_record.operation_name,
        'description', COALESCE(operation_record.operation_description, ''),
        'steps', steps_array
      );
      
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