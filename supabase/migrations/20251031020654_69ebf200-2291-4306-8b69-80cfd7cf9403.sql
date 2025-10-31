-- Fix field naming mismatch in rebuild_phases_json_from_templates
-- Change 'content_sections' to 'contentSections' to match frontend expectations

DROP FUNCTION IF EXISTS public.rebuild_phases_json_from_templates(uuid);

CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_templates(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  FOR phase_record IN
    SELECT DISTINCT
      tp.id,
      tp.name,
      tp.description,
      tp.phase_number,
      tp.project_template_id
    FROM template_phases tp
    INNER JOIN template_operations top ON top.phase_id = tp.id
    WHERE tp.project_template_id = p_project_id
    ORDER BY tp.phase_number
  LOOP
    operations_array := '[]'::jsonb;
    
    FOR operation_record IN
      SELECT
        top.id,
        top.name,
        top.description,
        top.operation_number,
        top.phase_id,
        top.project_template_id,
        top.parent_operation_id,
        top.is_custom_phase
      FROM template_operations top
      WHERE top.phase_id = phase_record.id
      ORDER BY top.operation_number
    LOOP
      steps_array := '[]'::jsonb;
      
      FOR step_record IN
        SELECT
          ts.id,
          ts.name,
          ts.description,
          ts.step_number,
          ts.operation_id,
          ts.estimated_time_minutes,
          ts.content_sections,
          ts.apps,
          ts.flow_type,
          ts.step_type
        FROM template_steps ts
        WHERE ts.operation_id = operation_record.id
        ORDER BY ts.step_number
      LOOP
        step_obj := jsonb_build_object(
          'id', step_record.id,
          'name', step_record.name,
          'description', step_record.description,
          'stepNumber', step_record.step_number,
          'operationId', step_record.operation_id,
          'estimatedTimeMinutes', step_record.estimated_time_minutes,
          'contentSections', step_record.content_sections,
          'apps', step_record.apps,
          'flowType', step_record.flow_type,
          'stepType', step_record.step_type
        );
        
        steps_array := steps_array || jsonb_build_array(step_obj);
      END LOOP;
      
      operation_obj := jsonb_build_object(
        'id', operation_record.id,
        'name', operation_record.name,
        'description', operation_record.description,
        'operationNumber', operation_record.operation_number,
        'phaseId', operation_record.phase_id,
        'projectTemplateId', operation_record.project_template_id,
        'parentOperationId', operation_record.parent_operation_id,
        'isCustomPhase', operation_record.is_custom_phase,
        'steps', steps_array
      );
      
      operations_array := operations_array || jsonb_build_array(operation_obj);
    END LOOP;
    
    phase_obj := jsonb_build_object(
      'id', phase_record.id,
      'name', phase_record.name,
      'description', phase_record.description,
      'phaseNumber', phase_record.phase_number,
      'projectTemplateId', phase_record.project_template_id,
      'operations', operations_array
    );
    
    phases_json := phases_json || jsonb_build_array(phase_obj);
  END LOOP;
  
  RETURN phases_json;
END;
$$;