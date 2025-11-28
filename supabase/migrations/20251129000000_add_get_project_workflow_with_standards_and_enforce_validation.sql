-- Migration: Add get_project_workflow_with_standards function and enforce validation
-- This function dynamically links standard phases from Standard Project Foundation to regular projects

BEGIN;

-- Step 1: Create get_project_workflow_with_standards function
-- This function returns phases for a project, dynamically linking standard phases from Standard Project Foundation
CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phases_json JSONB := '[]'::JSONB;
  phase_record RECORD;
  operations_json JSONB;
  operation_record RECORD;
  steps_json JSONB;
  step_record RECORD;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  custom_phase_ids UUID[];
  standard_phase_names TEXT[];
BEGIN
  -- Get custom phase IDs from this project
  SELECT ARRAY_AGG(id) INTO custom_phase_ids
  FROM project_phases
  WHERE project_id = p_project_id
    AND is_standard = false;
  
  -- Get standard phase names from Standard Project Foundation
  SELECT ARRAY_AGG(name) INTO standard_phase_names
  FROM project_phases
  WHERE project_id = standard_project_id
    AND is_standard = true;
  
  -- Build phases JSON by combining:
  -- 1. Custom phases from this project
  -- 2. Standard phases from Standard Project Foundation (dynamically linked)
  FOR phase_record IN
    SELECT 
      phase_id,
      phase_name,
      phase_description,
      phase_is_standard,
      phase_position_rule,
      phase_position_value,
      phase_project_id
    FROM (
      -- Custom phases from this project
      SELECT 
        pp.id AS phase_id,
        pp.name AS phase_name,
        pp.description AS phase_description,
        pp.is_standard AS phase_is_standard,
        pp.position_rule AS phase_position_rule,
        pp.position_value AS phase_position_value,
        pp.project_id AS phase_project_id,
        CASE 
          WHEN pp.position_rule = 'first' THEN 1
          WHEN pp.position_rule = 'last' THEN 999999
          WHEN pp.position_rule = 'last_minus_n' THEN 998
          WHEN pp.position_rule = 'nth' AND pp.position_value IS NOT NULL THEN pp.position_value::INTEGER
          ELSE 999998
        END AS sort_order
      FROM project_phases pp
      WHERE pp.project_id = p_project_id
        AND pp.is_standard = false
      
      UNION ALL
      
      -- Standard phases from Standard Project Foundation (dynamically linked)
      SELECT 
        std_pp.id AS phase_id,
        std_pp.name AS phase_name,
        std_pp.description AS phase_description,
        true AS phase_is_standard, -- Always true for standard phases
        std_pp.position_rule AS phase_position_rule,
        std_pp.position_value AS phase_position_value,
        p_project_id AS phase_project_id, -- Link to current project
        CASE 
          WHEN std_pp.position_rule = 'first' THEN 1
          WHEN std_pp.position_rule = 'last' THEN 999999
          WHEN std_pp.position_rule = 'last_minus_n' THEN 998
          WHEN std_pp.position_rule = 'nth' AND std_pp.position_value IS NOT NULL THEN std_pp.position_value::INTEGER
          ELSE 999998
        END AS sort_order
      FROM project_phases std_pp
      WHERE std_pp.project_id = standard_project_id
        AND std_pp.is_standard = true
    ) AS all_phases
    ORDER BY sort_order, phase_name
  LOOP
    operations_json := '[]'::JSONB;
    
    -- Get operations for this phase
    -- For standard phases, get from Standard Project Foundation
    -- For custom phases, get from current project
    FOR operation_record IN
      SELECT 
        id,
        operation_name,
        operation_description,
        flow_type,
        user_prompt,
        display_order,
        is_reference
      FROM template_operations
      WHERE phase_id = phase_record.phase_id
      ORDER BY display_order
    LOOP
      steps_json := '[]'::JSONB;
      
      FOR step_record IN
        SELECT 
          id,
          step_title,
          description,
          step_type,
          display_order
        FROM template_steps
        WHERE operation_id = operation_record.id
        ORDER BY display_order
      LOOP
        steps_json := steps_json || jsonb_build_array(
          jsonb_build_object(
            'id', step_record.id,
            'name', step_record.step_title,
            'description', step_record.description,
            'stepType', step_record.step_type,
            'displayOrder', step_record.display_order
          )
        );
      END LOOP;
      
      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', operation_record.id,
          'name', operation_record.operation_name,
          'description', operation_record.operation_description,
          'flowType', operation_record.flow_type,
          'userPrompt', operation_record.user_prompt,
          'displayOrder', operation_record.display_order,
          'isStandard', COALESCE(operation_record.is_reference, false) OR phase_record.phase_is_standard,
          'steps', steps_json
        )
      );
    END LOOP;
    
    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.phase_id,
        'name', phase_record.phase_name,
        'description', phase_record.phase_description,
        'operations', COALESCE(operations_json, '[]'::JSONB),
        'isStandard', phase_record.phase_is_standard,
        'isLinked', phase_record.phase_is_standard AND phase_record.phase_project_id = p_project_id, -- Standard phases are dynamically linked
        'phaseOrderNumber', 
          CASE 
            WHEN phase_record.phase_position_rule = 'first' THEN 1::INTEGER
            WHEN phase_record.phase_position_rule = 'last' THEN 999999::INTEGER
            WHEN phase_record.phase_position_rule = 'last_minus_n' THEN 998::INTEGER
            WHEN phase_record.phase_position_rule = 'nth' AND phase_record.phase_position_value IS NOT NULL 
              THEN phase_record.phase_position_value::INTEGER
            ELSE NULL::INTEGER
          END,
        'position_rule', phase_record.phase_position_rule,
        'position_value', phase_record.phase_position_value
      )
    );
  END LOOP;
  
  RETURN phases_json;
END;
$$;

COMMENT ON FUNCTION public.get_project_workflow_with_standards IS 
'Returns phases for a project, dynamically linking standard phases from Standard Project Foundation. Standard phases are always fetched from Standard Project Foundation to ensure they reflect the latest changes.';

COMMIT;

