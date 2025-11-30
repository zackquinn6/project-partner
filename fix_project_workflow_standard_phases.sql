-- Complete Fix: Ensure Standard Phases Appear in Project Workflows and Project Runs
-- This migration fixes both get_project_workflow_with_standards and create_project_run_snapshot
-- to ensure standard phases are always pulled from Standard Project Foundation and copied as static snapshots

-- ============================================
-- PART 1: Fix get_project_workflow_with_standards
-- ============================================
-- This function ALWAYS pulls standard phases from Standard Project Foundation
-- and merges them with custom phases from the template at the same time

CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(
  p_project_id UUID
)
RETURNS JSONB AS $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  workflow_json JSONB;
  standard_phases_json JSONB;
  custom_phases_json JSONB;
  is_standard_template BOOLEAN;
BEGIN
  -- Check if this is the Standard Project Foundation itself
  SELECT COALESCE(p.is_standard_template, false) INTO is_standard_template
  FROM public.projects p
  WHERE p.id = p_project_id;
  
  -- If this is the Standard Project Foundation, just return its phases directly
  IF is_standard_template = true OR p_project_id = standard_project_id THEN
    SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
    INTO workflow_json;
    RETURN COALESCE(workflow_json, '[]'::jsonb);
  END IF;
  
  -- ALWAYS get standard phases from Standard Project Foundation (never from templates)
  -- This ensures we get the latest standard phase content and step data
  -- Standard phases and their step content are copied at the same time as custom phases
  SELECT public.rebuild_phases_json_from_project_phases(standard_project_id)
  INTO standard_phases_json;
  
  -- Get custom phases from the template (non-standard phases only)
  -- Use rebuild_phases_json_from_project_phases and filter out standard phases
  -- This avoids manual JSON building and potential column reference issues
  -- Phases are already ordered by rebuild_phases_json_from_project_phases, so we preserve that order
  SELECT 
    COALESCE(jsonb_agg(phase), '[]'::jsonb)
  INTO custom_phases_json
  FROM (
    SELECT public.rebuild_phases_json_from_project_phases(p_project_id) as all_phases
  ) phases_data,
  jsonb_array_elements(phases_data.all_phases) as phase
  WHERE (phase->>'isStandard')::boolean = false 
     OR phase->>'isStandard' IS NULL;
  
  -- Merge: standard phases (from Standard Project Foundation) + custom phases (from template)
  -- Standard phases are copied fresh with all their step content at the same time as custom phases
  workflow_json := COALESCE(standard_phases_json, '[]'::jsonb) || COALESCE(custom_phases_json, '[]'::jsonb);
  
  RETURN COALESCE(workflow_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 1.5: Ensure get_operation_steps_json exists and is correct
-- ============================================
-- This function must exist and work correctly for rebuild_phases_json_from_project_phases to function
-- It retrieves steps for an operation, using explicit column references to avoid ambiguity

CREATE OR REPLACE FUNCTION public.get_operation_steps_json(
  p_operation_id UUID,
  p_is_reference BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  steps_json JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(step_obj ORDER BY step_obj->>'displayOrder', (step_obj->>'stepNumber')::int), '[]'::jsonb)
  INTO steps_json
  FROM (
    SELECT jsonb_build_object(
      'id', ts.id,
      'stepTitle', ts.step_title,
      'stepNumber', ts.step_number,
      'description', ts.description,
      'stepType', ts.step_type,
      'stepTypeId', ts.step_type_id,
      'flowType', ts.flow_type,
      'estimatedTimeMinutes', ts.estimated_time_minutes,
      'contentSections', ts.content_sections,
      'materials', ts.materials,
      'tools', ts.tools,
      'apps', ts.apps,
      'outputs', ts.outputs,
      'displayOrder', ts.display_order
    ) as step_obj
    FROM public.template_steps ts
    WHERE ts.operation_id = p_operation_id
    ORDER BY ts.display_order, ts.step_number
  ) ordered_steps;
  
  RETURN COALESCE(steps_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PART 1.6: Ensure rebuild_phases_json_from_project_phases exists and is correct
-- ============================================
-- This function must exist and work correctly for get_project_workflow_with_standards to function
-- If it doesn't exist or has errors, this will recreate it with the correct column references

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
  FOR phase_record IN
    SELECT 
      pp.id,
      pp.project_id,
      pp.name,
      pp.description,
      pp.is_standard,
      pp.standard_phase_id,
      pp.created_at
    FROM public.project_phases pp
    WHERE pp.project_id = p_project_id
    ORDER BY pp.created_at ASC
  LOOP
    operations_json := '[]'::jsonb;

    -- Use explicit column list to avoid any column reference issues
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
        op.display_order,
        op.is_standard_phase,
        op.source_operation_id,
        op.is_reference,
        src.name AS source_name,
        src.description AS source_description,
        src.flow_type AS source_flow_type,
        src.user_prompt AS source_user_prompt,
        src.alternate_group AS source_alternate_group
      FROM public.template_operations op
      LEFT JOIN public.template_operations src ON op.source_operation_id = src.id
      WHERE op.project_id = p_project_id
        AND op.phase_id = phase_record.id
      ORDER BY op.display_order
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
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', phase_record.is_standard
      )
    );
  END LOOP;

  RETURN phases_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PART 2: Fix create_project_run_snapshot
-- ============================================
-- This function now uses get_project_workflow_with_standards to get complete workflow
-- including standard phases pulled from Standard Project Foundation
-- All phases (standard, custom, incorporated) are assembled into a static snapshot

CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_template_id UUID,
  p_user_id UUID,
  p_run_name TEXT,
  p_home_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW(),
  p_plan_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_run_id UUID;
  workflow_json JSONB;
  default_home_id UUID;
  default_space_id UUID;
BEGIN
  -- Validate template exists
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_template_id) THEN
    RAISE EXCEPTION 'Template project not found: %', p_template_id;
  END IF;

  -- Get or create home for user
  IF p_home_id IS NOT NULL THEN
    default_home_id := p_home_id;
  ELSE
    -- Find user's primary home
    SELECT id INTO default_home_id
    FROM public.homes
    WHERE user_id = p_user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Create default home if user doesn't have one
    IF default_home_id IS NULL THEN
      INSERT INTO public.homes (user_id, name, address)
      VALUES (p_user_id, 'My Home', '')
      RETURNING id INTO default_home_id;
    END IF;
  END IF;

  -- CRITICAL: Use get_project_workflow_with_standards to get complete workflow
  -- This pulls standard phases from Standard Project Foundation and merges with custom phases
  -- This ensures standard phases and their step content are copied as static snapshot
  -- Standard phases, custom phases, and incorporated phases are all assembled together
  SELECT public.get_project_workflow_with_standards(p_template_id)
  INTO workflow_json;

  -- Validate we got phases
  IF workflow_json IS NULL OR jsonb_array_length(workflow_json) = 0 THEN
    RAISE EXCEPTION 'Template has no phases. Cannot create project run without phases.';
  END IF;

  -- Create project run record with the complete workflow JSON snapshot
  INSERT INTO public.project_runs (
    template_id,
    user_id,
    name,
    home_id,
    start_date,
    plan_end_date,
    phases,
    created_at,
    updated_at
  ) VALUES (
    p_template_id,
    p_user_id,
    p_run_name,
    default_home_id,
    p_start_date,
    p_plan_end_date,
    workflow_json,
    NOW(),
    NOW()
  ) RETURNING id INTO new_run_id;

  -- Create default space for project run
  INSERT INTO public.project_run_spaces (
    project_run_id,
    space_name,
    space_type,
    created_at
  ) VALUES (
    new_run_id,
    'Room 1',
    'room',
    NOW()
  ) RETURNING id INTO default_space_id;

  RETURN new_run_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Clean up project run if it was created before error
    IF new_run_id IS NOT NULL THEN
      DELETE FROM public.project_runs WHERE id = new_run_id;
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

