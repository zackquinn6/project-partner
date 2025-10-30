-- Phase 3: Update Core Database Functions

-- Update rebuild_phases_json_from_templates to handle both standard and custom phases
CREATE OR REPLACE FUNCTION rebuild_phases_json_from_templates(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  phases_array jsonb := '[]'::jsonb;
  phase_record RECORD;
  operations_array jsonb;
  operation_record RECORD;
  steps_array jsonb;
  step_record RECORD;
BEGIN
  -- Get all unique phases (both standard and custom)
  FOR phase_record IN
    SELECT DISTINCT 
      COALESCE(sp.id::text, 'custom_' || toper.custom_phase_name) as phase_id,
      COALESCE(sp.name, toper.custom_phase_name) as phase_name,
      COALESCE(sp.description, toper.custom_phase_description) as phase_description,
      COALESCE(sp.display_order, toper.custom_phase_display_order, 999) as display_order,
      (sp.id IS NULL) as is_custom,
      COALESCE(sp.is_locked, false) as is_locked
    FROM template_operations toper
    LEFT JOIN standard_phases sp ON sp.id = toper.standard_phase_id
    WHERE toper.project_id = p_project_id
    ORDER BY display_order, phase_name
  LOOP
    -- Get all operations for this phase
    operations_array := '[]'::jsonb;
    
    FOR operation_record IN
      SELECT 
        toper.id,
        toper.name,
        toper.description,
        toper.display_order,
        toper.flow_type,
        toper.user_prompt,
        toper.alternate_group,
        toper.dependent_on
      FROM template_operations toper
      LEFT JOIN standard_phases sp ON sp.id = toper.standard_phase_id
      WHERE toper.project_id = p_project_id
        AND (
          (phase_record.is_custom = false AND sp.id::text = phase_record.phase_id) OR
          (phase_record.is_custom = true AND toper.custom_phase_name = phase_record.phase_name)
        )
      ORDER BY toper.display_order
    LOOP
      -- Get all steps for this operation
      steps_array := '[]'::jsonb;
      
      FOR step_record IN
        SELECT 
          id,
          step_number,
          step_title,
          description,
          content_sections,
          materials,
          tools,
          outputs,
          apps,
          estimated_time_minutes,
          display_order,
          flow_type,
          step_type
        FROM template_steps
        WHERE operation_id = operation_record.id
        ORDER BY display_order
      LOOP
        steps_array := steps_array || jsonb_build_object(
          'id', step_record.id,
          'stepNumber', step_record.step_number,
          'step', step_record.step_title,
          'description', step_record.description,
          'content_sections', COALESCE(step_record.content_sections, '[]'::jsonb),
          'materials', COALESCE(step_record.materials, '[]'::jsonb),
          'tools', COALESCE(step_record.tools, '[]'::jsonb),
          'outputs', COALESCE(step_record.outputs, '[]'::jsonb),
          'apps', COALESCE(step_record.apps, '[]'::jsonb),
          'estimatedTimeMinutes', COALESCE(step_record.estimated_time_minutes, 0),
          'flowType', COALESCE(step_record.flow_type, 'prime'),
          'stepType', COALESCE(step_record.step_type, 'prime')
        );
      END LOOP;
      
      -- Build operation object
      operations_array := operations_array || jsonb_build_object(
        'id', operation_record.id,
        'name', operation_record.name,
        'description', operation_record.description,
        'steps', steps_array,
        'flowType', operation_record.flow_type,
        'userPrompt', operation_record.user_prompt,
        'alternateGroup', operation_record.alternate_group,
        'dependentOn', operation_record.dependent_on
      );
    END LOOP;
    
    -- Build phase object
    phases_array := phases_array || jsonb_build_object(
      'id', phase_record.phase_id,
      'name', phase_record.phase_name,
      'description', phase_record.phase_description,
      'operations', operations_array,
      'isStandard', NOT phase_record.is_custom,
      'isLocked', phase_record.is_locked
    );
  END LOOP;
  
  RETURN phases_array;
END;
$$;

-- Update sync_phases_to_templates to handle custom phases
CREATE OR REPLACE FUNCTION sync_phases_to_templates(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  project_phases jsonb;
  phase jsonb;
  operation jsonb;
  step jsonb;
  phase_name text;
  is_standard_phase boolean;
  standard_phase_record record;
  operation_id uuid;
  existing_operation_id uuid;
  max_display_order int;
  phase_display_order int := 0;
BEGIN
  -- Only admins can sync phases
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get project phases
  SELECT phases INTO project_phases
  FROM projects
  WHERE id = p_project_id;
  
  IF project_phases IS NULL OR jsonb_typeof(project_phases) != 'array' THEN
    RETURN;
  END IF;
  
  -- Get max display order for operations
  SELECT COALESCE(MAX(display_order), 0) INTO max_display_order
  FROM template_operations
  WHERE project_id = p_project_id;
  
  -- Process each phase
  FOR phase IN SELECT * FROM jsonb_array_elements(project_phases)
  LOOP
    phase_name := phase->>'name';
    is_standard_phase := COALESCE((phase->>'isStandard')::boolean, false);
    phase_display_order := phase_display_order + 1;
    
    -- Skip if phase has no operations
    IF phase->'operations' IS NULL OR jsonb_typeof(phase->'operations') != 'array' THEN
      CONTINUE;
    END IF;
    
    -- Get standard phase record if this is a standard phase
    IF is_standard_phase THEN
      SELECT * INTO standard_phase_record
      FROM standard_phases 
      WHERE name = phase_name 
      LIMIT 1;
    END IF;
    
    -- Process each operation in the phase
    FOR operation IN SELECT * FROM jsonb_array_elements(phase->'operations')
    LOOP
      -- Check if operation already exists (by name and phase)
      SELECT id INTO existing_operation_id
      FROM template_operations
      WHERE project_id = p_project_id
        AND name = operation->>'name'
        AND (
          (is_standard_phase AND standard_phase_id = standard_phase_record.id) OR
          (NOT is_standard_phase AND custom_phase_name = phase_name)
        )
      LIMIT 1;
      
      IF existing_operation_id IS NULL THEN
        -- Create new operation
        max_display_order := max_display_order + 1;
        
        IF is_standard_phase THEN
          -- Standard phase operation
          INSERT INTO template_operations (
            project_id,
            standard_phase_id,
            custom_phase_name,
            custom_phase_description,
            custom_phase_display_order,
            name,
            description,
            display_order,
            flow_type,
            user_prompt,
            alternate_group,
            dependent_on
          ) VALUES (
            p_project_id,
            standard_phase_record.id,
            NULL,
            NULL,
            NULL,
            operation->>'name',
            operation->>'description',
            max_display_order,
            operation->>'flowType',
            operation->>'userPrompt',
            operation->>'alternateGroup',
            (operation->>'dependentOn')::uuid
          ) RETURNING id INTO operation_id;
        ELSE
          -- Custom phase operation
          INSERT INTO template_operations (
            project_id,
            standard_phase_id,
            custom_phase_name,
            custom_phase_description,
            custom_phase_display_order,
            name,
            description,
            display_order,
            flow_type,
            user_prompt,
            alternate_group,
            dependent_on
          ) VALUES (
            p_project_id,
            NULL,
            phase_name,
            phase->>'description',
            phase_display_order,
            operation->>'name',
            operation->>'description',
            max_display_order,
            operation->>'flowType',
            operation->>'userPrompt',
            operation->>'alternateGroup',
            (operation->>'dependentOn')::uuid
          ) RETURNING id INTO operation_id;
        END IF;
        
        -- Create steps for this operation
        IF operation->'steps' IS NOT NULL AND jsonb_typeof(operation->'steps') = 'array' THEN
          FOR step IN SELECT * FROM jsonb_array_elements(operation->'steps')
          LOOP
            INSERT INTO template_steps (
              operation_id,
              step_number,
              step_title,
              description,
              content_sections,
              materials,
              tools,
              outputs,
              apps,
              estimated_time_minutes,
              display_order,
              flow_type,
              step_type
            ) VALUES (
              operation_id,
              COALESCE((step->>'stepNumber')::int, 1),
              step->>'step',
              step->>'description',
              COALESCE(step->'content_sections', '[]'::jsonb),
              COALESCE(step->'materials', '[]'::jsonb),
              COALESCE(step->'tools', '[]'::jsonb),
              COALESCE(step->'outputs', '[]'::jsonb),
              COALESCE(step->'apps', '[]'::jsonb),
              COALESCE((step->>'estimatedTimeMinutes')::int, 0),
              COALESCE((step->>'stepNumber')::int, 1),
              COALESCE(step->>'flowType', 'prime'::text),
              COALESCE(step->>'stepType', 'prime'::text)
            );
          END LOOP;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  -- Log the sync
  PERFORM log_comprehensive_security_event(
    'phases_synced_to_templates',
    'low',
    'Synced phases JSONB to template tables for project: ' || p_project_id,
    auth.uid(),
    NULL, NULL, NULL,
    jsonb_build_object(
      'project_id', p_project_id,
      'phase_count', jsonb_array_length(project_phases)
    )
  );
END;
$$;