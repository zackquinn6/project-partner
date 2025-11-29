-- Create project run snapshot function
-- This function creates an immutable snapshot of a project template including:
-- - All phases (standard, custom, incorporated) - copied, not linked
-- - All operations with flow_type
-- - All steps with all content (materials, tools, outputs, instructions, etc.)
-- - Creates spaces (ensures user has home with at least one room)
-- - Builds phases JSON directly from database records
-- - Handles single-piece flow logic

BEGIN;

CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_template_id UUID,
  p_user_id UUID,
  p_run_name TEXT,
  p_home_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW(),
  p_plan_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_run_id UUID;
  user_home_id UUID;
  default_space_id UUID;
  template_phase RECORD;
  template_operation RECORD;
  template_step RECORD;
  phases_json JSONB := '[]'::JSONB;
  phase_array JSONB[];
  operation_array JSONB[];
  step_array JSONB[];
  quick_instruction JSONB;
  detailed_instruction JSONB;
  contractor_instruction JSONB;
  phase_order_number JSONB;
BEGIN
  -- Step 1: Ensure user has a home with at least one room
  -- If p_home_id is provided, use it; otherwise find or create user's primary home
  IF p_home_id IS NOT NULL THEN
    user_home_id := p_home_id;
  ELSE
    -- Find user's primary home
    SELECT id INTO user_home_id
    FROM homes
    WHERE user_id = p_user_id AND is_primary = true
    LIMIT 1;
    
    -- If no primary home exists, create one
    IF user_home_id IS NULL THEN
      INSERT INTO homes (user_id, name, is_primary, created_at, updated_at)
      VALUES (p_user_id, 'My Home', true, NOW(), NOW())
      RETURNING id INTO user_home_id;
    END IF;
  END IF;
  
  -- Note: Spaces are created per project run, not per home
  -- We'll create a default space for the project run below
  
  -- Step 2: Create project run record
  INSERT INTO project_runs (
    template_id,
    user_id,
    name,
    description,
    start_date,
    plan_end_date,
    status,
    home_id,
    progress,
    completed_steps,
    phases,
    created_at,
    updated_at
  )
  SELECT 
    p_template_id,
    p_user_id,
    p_run_name,
    description,
    p_start_date,
    COALESCE(p_plan_end_date, p_start_date + INTERVAL '30 days'),
    'not-started',
    user_home_id,
    0,
    '[]'::JSONB,
    '[]'::JSONB, -- Will be populated below
    NOW(),
    NOW()
  FROM projects
  WHERE id = p_template_id
  RETURNING id INTO new_run_id;
  
  -- Step 3: Copy all phases from template (standard, custom, and incorporated)
  -- Order by position_rule and position_value to maintain correct order
  FOR template_phase IN
    SELECT 
      pp.id AS phase_id,
      pp.name AS phase_name,
      pp.description AS phase_description,
      pp.is_standard AS phase_is_standard,
      pp.position_rule AS phase_position_rule,
      pp.position_value AS phase_position_value,
      pp.source_project_id AS phase_source_project_id,
      pp.source_phase_id AS phase_source_phase_id,
      CASE 
        WHEN pp.position_rule = 'first' THEN 1
        WHEN pp.position_rule = 'last' THEN 999999
        WHEN pp.position_rule = 'nth' AND pp.position_value IS NOT NULL THEN pp.position_value::INTEGER
        ELSE 100
      END AS sort_order
    FROM project_phases pp
    WHERE pp.project_id = p_template_id
    ORDER BY sort_order
  LOOP
    -- Reset operation array for this phase
    operation_array := ARRAY[]::JSONB[];
    
    -- Step 4: Copy all operations for this phase
    -- For incorporated phases, fetch from source_phase_id; otherwise from current phase
    FOR template_operation IN
      SELECT 
        op.id AS operation_id,
        op.operation_name,
        op.operation_description,
        op.flow_type,
        op.user_prompt,
        op.display_order,
        op.is_reference,
        op.alternate_group
      FROM template_operations op
      WHERE op.phase_id = COALESCE(template_phase.phase_source_phase_id, template_phase.phase_id)
      ORDER BY op.display_order
    LOOP
      -- Reset step array for this operation
      step_array := ARRAY[]::JSONB[];
      
      -- Step 5: Copy all steps for this operation with ALL content
      FOR template_step IN
        SELECT 
          s.id AS step_id,
          s.step_title,
          s.description,
          s.step_type,
          s.display_order,
          s.content_sections,
          s.materials,
          s.tools,
          s.outputs,
          s.apps,
          s.flow_type,
          s.time_estimate_low,
          s.time_estimate_medium,
          s.time_estimate_high,
          s.workers_needed,
          s.skill_level
        FROM template_steps s
        WHERE s.operation_id = template_operation.operation_id
        ORDER BY s.display_order
      LOOP
        -- Fetch instructions for this step (initialize to empty arrays first)
        quick_instruction := '[]'::JSONB;
        detailed_instruction := '[]'::JSONB;
        contractor_instruction := '[]'::JSONB;
        
        SELECT COALESCE(content, '[]'::JSONB) INTO quick_instruction
        FROM step_instructions
        WHERE template_step_id = template_step.step_id AND instruction_level = 'quick'
        LIMIT 1;
        
        SELECT COALESCE(content, '[]'::JSONB) INTO detailed_instruction
        FROM step_instructions
        WHERE template_step_id = template_step.step_id AND instruction_level = 'detailed'
        LIMIT 1;
        
        SELECT COALESCE(content, '[]'::JSONB) INTO contractor_instruction
        FROM step_instructions
        WHERE template_step_id = template_step.step_id AND instruction_level = 'contractor'
        LIMIT 1;
        
        -- Ensure values are not null
        quick_instruction := COALESCE(quick_instruction, '[]'::JSONB);
        detailed_instruction := COALESCE(detailed_instruction, '[]'::JSONB);
        contractor_instruction := COALESCE(contractor_instruction, '[]'::JSONB);
        
        -- Build step JSON with all content including instructions
        step_array := step_array || jsonb_build_object(
          'id', template_step.step_id,
          'step', template_step.step_title,
          'description', template_step.description,
          'stepType', template_step.step_type,
          'displayOrder', template_step.display_order,
          'contentSections', COALESCE(template_step.content_sections, '[]'::JSONB),
          'materials', COALESCE(template_step.materials, '[]'::JSONB),
          'tools', COALESCE(template_step.tools, '[]'::JSONB),
          'outputs', COALESCE(template_step.outputs, '[]'::JSONB),
          'apps', COALESCE(template_step.apps, '[]'::JSONB),
          'flowType', template_step.flow_type,
          'timeEstimates', jsonb_build_object(
            'low', COALESCE(template_step.time_estimate_low, 0),
            'medium', COALESCE(template_step.time_estimate_medium, 0),
            'high', COALESCE(template_step.time_estimate_high, 0)
          ),
          'workersNeeded', COALESCE(template_step.workers_needed, 1),
          'skillLevel', template_step.skill_level,
          'instructions', jsonb_build_object(
            'quick', quick_instruction,
            'detailed', detailed_instruction,
            'contractor', contractor_instruction
          )
        );
      END LOOP;
      
      -- Build operation JSON with all steps
      operation_array := operation_array || jsonb_build_object(
        'id', template_operation.operation_id,
        'name', template_operation.operation_name,
        'description', template_operation.operation_description,
        'flowType', template_operation.flow_type,
        'userPrompt', template_operation.user_prompt,
        'displayOrder', template_operation.display_order,
        'isStandard', COALESCE(template_operation.is_reference, false),
        'alternateGroup', template_operation.alternate_group,
        'steps', to_jsonb(step_array)
      );
    END LOOP;
    
    -- Compute phaseOrderNumber based on position_rule
    IF template_phase.phase_position_rule = 'first' THEN
      phase_order_number := to_jsonb(1);
    ELSIF template_phase.phase_position_rule = 'last' THEN
      phase_order_number := to_jsonb('last');
    ELSIF template_phase.phase_position_rule = 'nth' AND template_phase.phase_position_value IS NOT NULL THEN
      phase_order_number := to_jsonb(template_phase.phase_position_value);
    ELSE
      phase_order_number := to_jsonb(999);
    END IF;
    
    -- Build phase JSON with all operations
    phase_array := phase_array || jsonb_build_object(
      'id', template_phase.phase_id,
      'name', template_phase.phase_name,
      'description', template_phase.phase_description,
      'isStandard', COALESCE(template_phase.phase_is_standard, false),
      'isLinked', (template_phase.phase_source_project_id IS NOT NULL),
      'sourceProjectId', template_phase.phase_source_project_id,
      'sourcePhaseId', template_phase.phase_source_phase_id,
      'positionRule', template_phase.phase_position_rule,
      'positionValue', template_phase.phase_position_value,
      'phaseOrderNumber', phase_order_number,
      'operations', to_jsonb(operation_array)
    );
  END LOOP;
  
  -- Step 6: Build final phases JSON array
  phases_json := to_jsonb(phase_array);
  
  -- Step 7: Update project run with phases JSON
  UPDATE project_runs
  SET phases = phases_json
  WHERE id = new_run_id;
  
  -- Step 8: Create default space for project run
  -- For single-piece flow, custom and incorporated phases are contained under a space
  -- Default to "Room 1" if no spaces exist
  IF NOT EXISTS (
    SELECT 1 FROM project_run_spaces 
    WHERE project_run_id = new_run_id
  ) THEN
    INSERT INTO project_run_spaces (
      project_run_id,
      space_name,
      space_type,
      priority,
      created_at,
      updated_at
    )
    VALUES (
      new_run_id,
      'Room 1',
      'room',
      1,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN new_run_id;
END;
$$;

COMMENT ON FUNCTION public.create_project_run_snapshot IS 
'Creates an immutable snapshot of a project template as a project run. Copies all phases (standard, custom, incorporated), operations with flow_type, and steps with all content. Creates default space for single-piece flow. Builds phases JSON directly from database records.';

COMMIT;

