-- Comprehensive fix for rebuild_phases_json_from_project_phases function
-- This ensures ALL phases (standard + custom) are correctly rebuilt from relational tables
-- and properly includes phaseOrderNumber for standard phases

-- First, drop ALL existing overloads using dynamic SQL to avoid "function name is not unique" error
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Find all functions with this name and drop them
  FOR func_record IN
    SELECT 
      p.oid,
      pg_get_function_identity_arguments(p.oid) as arguments
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'rebuild_phases_json_from_project_phases'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.rebuild_phases_json_from_project_phases(%s) CASCADE', 
                   func_record.arguments);
  END LOOP;
END $$;

-- Create comprehensive rebuild function that queries ALL phases from project_phases table
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  phases_json JSONB := '[]'::jsonb;
  phase_record RECORD;
  operation_record RECORD;
  step_record RECORD;
  operations_json JSONB;
  steps_json JSONB;
  phase_order_json_value JSONB;
  phase_count INTEGER := 0;
  effective_project_id UUID;
BEGIN
  -- Determine the effective project ID to use for querying phases
  -- If this is a revision (has parent_project_id), we need to check if phases exist
  -- for this revision or if we should use the parent project
  SELECT 
    CASE 
      WHEN parent_project_id IS NOT NULL THEN
        -- This is a revision - check if it has its own phases or use parent
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM public.project_phases WHERE project_id = p_project_id
          ) THEN p_project_id
          ELSE parent_project_id
        END
      ELSE p_project_id
    END
  INTO effective_project_id
  FROM public.projects
  WHERE id = p_project_id;

  -- If project doesn't exist, raise error
  IF effective_project_id IS NULL THEN
    RAISE EXCEPTION 'Project % does not exist', p_project_id;
  END IF;

  -- Count phases to validate
  SELECT COUNT(*) INTO phase_count
  FROM public.project_phases
  WHERE project_id = effective_project_id;

  IF phase_count = 0 THEN
    -- Return empty array but log warning - don't raise exception
    -- This allows the function to complete even if project has no phases yet
    RAISE WARNING 'Project % (effective: %) has no phases in project_phases table', p_project_id, effective_project_id;
    -- Still update the projects table with empty array to ensure consistency
    UPDATE public.projects
    SET phases = '[]'::jsonb,
        updated_at = NOW()
    WHERE id = p_project_id;
    RETURN '[]'::jsonb;
  END IF;

  -- Loop through ALL phases for this project, ordered by display_order
  FOR phase_record IN
    SELECT 
      pp.id,
      pp.name,
      pp.description,
      pp.is_standard,
      pp.display_order,
      pp.standard_phase_id,
      sp.position_rule,
      sp.position_value
    FROM public.project_phases pp
    LEFT JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
    WHERE pp.project_id = effective_project_id
    ORDER BY pp.display_order
  LOOP
    operations_json := '[]'::jsonb;

    -- Calculate phaseOrderNumber from standard_phases.position_rule
    IF phase_record.standard_phase_id IS NOT NULL AND phase_record.position_rule IS NOT NULL THEN
      IF phase_record.position_rule = 'first' THEN
        phase_order_json_value := '"first"'::jsonb;
      ELSIF phase_record.position_rule = 'last' THEN
        phase_order_json_value := '"last"'::jsonb;
      ELSIF phase_record.position_rule = 'nth' AND phase_record.position_value IS NOT NULL THEN
        phase_order_json_value := phase_record.position_value::jsonb;
      ELSIF phase_record.position_rule = 'last_minus_n' AND phase_record.position_value IS NOT NULL THEN
        -- For last_minus_n, use a large number (999 - position_value) so it sorts after regular phases but before 'last'
        phase_order_json_value := (999 - phase_record.position_value)::jsonb;
      ELSE
        phase_order_json_value := NULL;
      END IF;
    ELSE
      phase_order_json_value := NULL;
    END IF;

    -- Loop through ALL operations for this phase
    -- Operations are linked to phases via phase_id, so we only filter by phase_id
    -- The project_id filter might fail for revision projects where operations weren't copied
    FOR operation_record IN
      SELECT 
        op.id,
        op.name,
        op.description,
        op.flow_type,
        op.user_prompt,
        op.alternate_group,
        op.display_order,
        op.is_standard_phase,
        op.is_reference,
        op.source_operation_id
      FROM public.template_operations op
      WHERE op.phase_id = phase_record.id
      ORDER BY op.display_order
    LOOP
      steps_json := '[]'::jsonb;

      -- Loop through ALL steps for this operation
      FOR step_record IN
        SELECT 
          ts.id,
          ts.name,
          ts.description,
          ts.content_sections,
          ts.materials,
          ts.tools,
          ts.outputs,
          ts.display_order,
          ts.is_optional,
          ts.estimated_time_minutes
        FROM public.template_steps ts
        WHERE ts.operation_id = operation_record.id
        ORDER BY ts.display_order
      LOOP
        steps_json := steps_json || jsonb_build_array(
          jsonb_build_object(
            'id', step_record.id,
            'name', step_record.name,
            'description', COALESCE(step_record.description, ''),
            'contentSections', COALESCE(step_record.content_sections, '[]'::jsonb),
            'materials', COALESCE(step_record.materials, '[]'::jsonb),
            'tools', COALESCE(step_record.tools, '[]'::jsonb),
            'outputs', COALESCE(step_record.outputs, '[]'::jsonb),
            'displayOrder', COALESCE(step_record.display_order, 0),
            'isOptional', COALESCE(step_record.is_optional, false),
            'estimatedTimeMinutes', step_record.estimated_time_minutes
          )
      );
    END LOOP;

    -- CRITICAL VALIDATION: Every operation must have at least one step
    IF jsonb_array_length(steps_json) = 0 THEN
      RAISE EXCEPTION 'Phase "%" (ID: %) has operation "%" (ID: %) with no steps. Every operation must have at least one step.', 
        phase_record.name, phase_record.id, operation_record.name, operation_record.id;
    END IF;

    -- Build operation JSON object with steps
    operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', operation_record.id,
          'name', operation_record.name,
          'description', COALESCE(operation_record.description, ''),
          'flowType', COALESCE(operation_record.flow_type, 'prime'),
          'userPrompt', operation_record.user_prompt,
          'alternateGroup', operation_record.alternate_group,
          'displayOrder', COALESCE(operation_record.display_order, 0),
          'isStandard', COALESCE(operation_record.is_standard_phase, false) OR phase_record.is_standard,
          'isReference', COALESCE(operation_record.is_reference, false),
          'sourceOperationId', operation_record.source_operation_id,
          'steps', steps_json
        )
      );
    END LOOP;

    -- CRITICAL VALIDATION: Every phase must have at least one operation
    IF jsonb_array_length(operations_json) = 0 THEN
      RAISE EXCEPTION 'Phase "%" (ID: %) has no operations. Every phase must have at least one operation.', 
        phase_record.name, phase_record.id;
    END IF;

    -- Build phase JSON object with operations
    IF phase_order_json_value IS NOT NULL THEN
      phases_json := phases_json || jsonb_build_array(
        jsonb_build_object(
          'id', phase_record.id,
          'name', phase_record.name,
          'description', COALESCE(phase_record.description, ''),
          'isStandard', COALESCE(phase_record.is_standard, false),
          'phaseOrderNumber', phase_order_json_value,
          'operations', operations_json
        )
      );
    ELSE
      phases_json := phases_json || jsonb_build_array(
        jsonb_build_object(
          'id', phase_record.id,
          'name', phase_record.name,
          'description', COALESCE(phase_record.description, ''),
          'isStandard', COALESCE(phase_record.is_standard, false),
          'operations', operations_json
        )
      );
    END IF;
  END LOOP;

  -- CRITICAL: Update projects.phases column with rebuilt JSON
  UPDATE public.projects
  SET phases = phases_json,
      updated_at = NOW()
  WHERE id = p_project_id;

  -- Return the rebuilt phases JSON
  RETURN phases_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.rebuild_phases_json_from_project_phases IS 
'Rebuilds the phases JSONB column for a project from relational tables (project_phases, template_operations, template_steps).
Queries ALL phases, operations, and steps for the project and builds complete nested JSON structure.
Includes phaseOrderNumber for standard phases based on standard_phases.position_rule.
Updates projects.phases column with the rebuilt JSON to keep it in sync with relational data.

VALIDATION REQUIREMENTS:
- Every phase MUST have at least one operation. If a phase has no operations, an exception is raised.
- Every operation MUST have at least one step. If an operation has no steps, an exception is raised.
These validations ensure data integrity and prevent incomplete project structures.';

-- Drop ALL existing overloads of create_project_run_snapshot
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT pg_get_function_identity_arguments(p.oid) as arguments
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project_run_snapshot'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.create_project_run_snapshot(%s) CASCADE', 
                   func_record.arguments);
  END LOOP;
END $$;

-- Create comprehensive create_project_run_snapshot function
CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_template_id UUID,
  p_user_id UUID,
  p_run_name TEXT,
  p_home_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW(),
  p_plan_end_date TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_run_id UUID;
  default_space_id UUID;
  template_phases_json JSONB;
  phase_count_before INTEGER;
  phase_count_after INTEGER;
BEGIN
  -- Validate template exists
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_template_id) THEN
    RAISE EXCEPTION 'Template project % does not exist', p_template_id;
  END IF;

  -- Count phases before rebuild
  SELECT COUNT(*) INTO phase_count_before
  FROM public.project_phases
  WHERE project_id = p_template_id;

  IF phase_count_before = 0 THEN
    RAISE EXCEPTION 'Cannot create project run: Template % has no phases in project_phases table.', p_template_id;
  END IF;

  -- CRITICAL: Always rebuild phases from relational structure first
  -- First check if the function exists
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'rebuild_phases_json_from_project_phases'
      AND pg_get_function_identity_arguments(p.oid) = 'p_project_id uuid'
  ) THEN
    RAISE EXCEPTION 'Cannot create project run: rebuild_phases_json_from_project_phases function does not exist. Please apply the migration to create this function.';
  END IF;

  -- Rebuild phases
  BEGIN
    PERFORM public.rebuild_phases_json_from_project_phases(p_template_id);
  EXCEPTION WHEN OTHERS THEN
    -- Log the full error for debugging
    RAISE WARNING 'Rebuild phases failed for template %: % (SQLSTATE: %)', p_template_id, SQLERRM, SQLSTATE;
    
    -- Re-raise with more context - include the actual error message
    RAISE EXCEPTION 'Failed to rebuild phases for template %: %. Template has % phases in project_phases table. Please verify all phases have valid operations and steps linked correctly.', 
      p_template_id,
      SQLERRM,
      phase_count_before;
  END;
  
  -- Get the phases JSON from the template project after rebuild
  SELECT phases INTO template_phases_json
  FROM public.projects
  WHERE id = p_template_id;
  
  -- Validate that we have phases after rebuild
  IF template_phases_json IS NULL OR template_phases_json::text = 'null' OR template_phases_json::text = '[]' THEN
    RAISE EXCEPTION 'Cannot create project run: Template % phases JSON is empty after rebuild. Template has % phases in project_phases table but rebuild returned empty JSON.', p_template_id, phase_count_before;
  END IF;

  -- Validate phases JSON structure
  IF jsonb_typeof(template_phases_json) != 'array' THEN
    RAISE EXCEPTION 'Invalid phases JSON structure for template %. Phases must be a JSON array.', p_template_id;
  END IF;

  -- Get count of phases in JSON
  phase_count_after := jsonb_array_length(template_phases_json);

  -- Validate phase count
  IF phase_count_after = 0 THEN
    RAISE EXCEPTION 'Template % has an empty phases array after rebuild. Template has % phases in project_phases table.', p_template_id, phase_count_before;
  END IF;

  IF phase_count_after < phase_count_before THEN
    RAISE WARNING 'Template % has % phases in JSON but % phases in project_phases table. Some phases may be missing operations.', p_template_id, phase_count_after, phase_count_before;
  END IF;

  -- Verify user_id is provided
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create project run: user_id is required. Project runs are user-specific.';
  END IF;

  -- Create the project run with phases included in the initial INSERT
  INSERT INTO public.project_runs (
    template_id,
    user_id,
    name,
    custom_project_name,
    home_id,
    start_date,
    plan_end_date,
    status,
    phases,
    completion_priority,
    created_at,
    updated_at
  ) VALUES (
    p_template_id,
    p_user_id,
    p_run_name,
    p_run_name,
    p_home_id,
    p_start_date,
    p_plan_end_date,
    'not-started',
    template_phases_json,
    'agile',
    NOW(),
    NOW()
  ) RETURNING id INTO new_run_id;

  -- Verify phases were saved correctly
  DECLARE
    saved_phases JSONB;
    saved_phases_count INTEGER;
  BEGIN
    SELECT phases, jsonb_array_length(phases) INTO saved_phases, saved_phases_count
    FROM public.project_runs
    WHERE id = new_run_id;
    
    IF saved_phases IS NULL OR saved_phases_count = 0 THEN
      DELETE FROM public.project_runs WHERE id = new_run_id;
      RAISE EXCEPTION 'Failed to save phases to project run. Template had % phases but project run saved with 0 phases.', phase_count_after;
    END IF;

    IF saved_phases_count < phase_count_after THEN
      RAISE WARNING 'Project run created with % phases but template had % phases.', saved_phases_count, phase_count_after;
    END IF;
  END;

  -- Create default space "Room 1"
  INSERT INTO public.project_run_spaces (
    project_run_id,
    space_name,
    space_type,
    is_from_home,
    priority,
    created_at,
    updated_at
  ) VALUES (
    new_run_id,
    'Room 1',
    'general',
    false,
    1,
    NOW(),
    NOW()
  ) RETURNING id INTO default_space_id;

  RETURN new_run_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.create_project_run_snapshot IS 
'Creates an immutable project run snapshot with complete phases data. 
Always rebuilds phases from relational structure before copying to ensure completeness.
Validates phases exist and are properly structured before creating the project run.
Raises exceptions if template has no phases or if phases cannot be copied correctly.';

-- Ensure RLS is enabled
ALTER TABLE public.project_runs ENABLE ROW LEVEL SECURITY;

