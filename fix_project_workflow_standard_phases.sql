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
  -- Build custom phases directly from project_phases where is_standard = false
  custom_phases_json := (
    SELECT COALESCE(jsonb_agg(phase_obj), '[]'::jsonb)
    FROM (
      SELECT 
        jsonb_build_object(
          'id', pp.id::text,
          'name', pp.name,
          'description', pp.description,
          'isStandard', false,
          'display_order', pp.display_order,
          'operations', COALESCE(
            (
              SELECT jsonb_agg(op_obj)
              FROM (
                SELECT 
                  jsonb_build_object(
                    'id', op.id::text,
                    'name', op.name,
                    'description', op.description,
                    'flowType', op.flow_type,
                    'display_order', op.display_order,
                    'steps', public.get_operation_steps_json(op.id, COALESCE(op.is_reference, false))
                  ) as op_obj
                FROM public.template_operations op
                WHERE op.phase_id = pp.id
                  AND op.project_id = p_project_id
                ORDER BY op.display_order
              ) op_data
            ),
            '[]'::jsonb
          )
        ) as phase_obj
      FROM public.project_phases pp
      WHERE pp.project_id = p_project_id
        AND pp.is_standard = false
      ORDER BY pp.display_order
    ) phase_data
  );
  
  -- Merge: standard phases (from Standard Project Foundation) + custom phases (from template)
  -- Standard phases are copied fresh with all their step content at the same time as custom phases
  workflow_json := COALESCE(standard_phases_json, '[]'::jsonb) || COALESCE(custom_phases_json, '[]'::jsonb);
  
  RETURN COALESCE(workflow_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    name,
    display_order,
    created_at
  ) VALUES (
    new_run_id,
    'Room 1',
    1,
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

