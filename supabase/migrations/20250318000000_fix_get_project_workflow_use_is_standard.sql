-- Use actual schema: phase_operations and operation_steps (not template_operations/template_steps).
-- Defines get_operation_steps_json and rebuild_phases_json_from_project_phases so get_project_workflow_with_standards works.
-- First, drop any old overloads that may conflict with the new canonical signature.

DROP FUNCTION IF EXISTS public.get_operation_steps_json(UUID);
DROP FUNCTION IF EXISTS public.get_operation_steps_json(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_operation_steps_json(p_operation_id UUID, p_is_reference BOOLEAN DEFAULT false)
RETURNS JSONB AS $$
DECLARE
  steps_json JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', os.id,
      'step', os.step_title,
      'description', os.description,
      'contentSections', os.content_sections,
      'materials', os.materials,
      'tools', os.tools,
      'outputs', os.outputs,
      'displayOrder', os.display_order,
      'timeEstimateLow', os.time_estimate_low,
      'timeEstimateMedium', os.time_estimate_med,
      'timeEstimateHigh', os.time_estimate_high,
      'content', os.content,
      'contentType', os.content_type,
      'flowType', os.flow_type,
      'stepType', os.step_type
    )
    ORDER BY os.display_order
  ), '[]'::jsonb)
  INTO steps_json
  FROM public.operation_steps os
  WHERE os.operation_id = p_operation_id;
  RETURN COALESCE(steps_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  phases_json JSONB := '[]'::jsonb;
  phase_record RECORD;
  operations_json JSONB;
  op_record RECORD;
  steps_json JSONB;
BEGIN
  FOR phase_record IN
    SELECT id, project_id, name, description, is_standard, position_rule, position_value, display_order
    FROM public.project_phases
    WHERE project_id = p_project_id
    ORDER BY
      CASE
        WHEN position_rule = 'nth' THEN COALESCE(position_value, 999)
        WHEN position_rule = 'last' THEN 2147483647
        ELSE 999
      END ASC,
      display_order ASC,
      created_at ASC
  LOOP
    operations_json := '[]'::jsonb;
    FOR op_record IN
      SELECT id, phase_id, operation_name, operation_description, flow_type, display_order
      FROM public.phase_operations
      WHERE phase_id = phase_record.id
      ORDER BY display_order ASC
    LOOP
      steps_json := public.get_operation_steps_json(op_record.id, false);
      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', op_record.id,
          'name', op_record.operation_name,
          'description', op_record.operation_description,
          'flowType', COALESCE(op_record.flow_type, 'prime'),
          'steps', COALESCE(steps_json, '[]'::jsonb),
          'isStandard', phase_record.is_standard
        )
      );
    END LOOP;
    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', phase_record.is_standard,
        'phaseOrderNumber',
          CASE
            WHEN phase_record.position_rule = 'last' THEN '"last"'::jsonb
            WHEN phase_record.position_rule = 'nth' AND phase_record.position_value IS NOT NULL THEN to_jsonb(phase_record.position_value)
            ELSE to_jsonb(999)
          END,
        'position_rule', phase_record.position_rule,
        'position_value', phase_record.position_value
      )
    );
  END LOOP;
  RETURN COALESCE(phases_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fix get_project_workflow_with_standards: use is_standard (actual column) and resolve Standard Project at runtime.
-- Ensures standard phases are compiled into the workflow so templates (e.g. Tile Flooring) get foundation phases.

CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(
  p_project_id UUID
)
RETURNS JSONB AS $$
DECLARE
  standard_project_id UUID;
  workflow_json JSONB;
  standard_phases_json JSONB;
  custom_phases_json JSONB;
  is_standard_project BOOLEAN;
  template_phases_fallback JSONB;
BEGIN
  -- Resolve Standard Project Foundation: by is_standard = true, or fallback to well-known UUID
  SELECT id INTO standard_project_id
  FROM public.projects
  WHERE is_standard = true
  LIMIT 1;
  IF standard_project_id IS NULL THEN
    standard_project_id := '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;

  -- Check if this is the Standard Project Foundation itself
  SELECT COALESCE(p.is_standard, false) INTO is_standard_project
  FROM public.projects p
  WHERE p.id = p_project_id;

  IF is_standard_project = true OR p_project_id = standard_project_id THEN
    SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
    INTO workflow_json;
    RETURN COALESCE(workflow_json, '[]'::jsonb);
  END IF;

  -- ALWAYS get standard phases from Standard Project Foundation (never from templates)
  SELECT public.rebuild_phases_json_from_project_phases(standard_project_id)
  INTO standard_phases_json;

  -- Get custom phases from the template (non-standard phases only); handle NULL all_phases
  SELECT COALESCE(jsonb_agg(phase), '[]'::jsonb)
  INTO custom_phases_json
  FROM (
    SELECT public.rebuild_phases_json_from_project_phases(p_project_id) AS all_phases
  ) phases_data,
  LATERAL jsonb_array_elements(COALESCE(phases_data.all_phases, '[]'::jsonb)) AS phase
  WHERE (phase->>'isStandard') IS DISTINCT FROM 'true';

  -- Merge: standard phases first, then custom phases
  workflow_json := COALESCE(standard_phases_json, '[]'::jsonb) || COALESCE(custom_phases_json, '[]'::jsonb);

  -- Fallback: if merged workflow is empty, use template's projects.phases so runs can still start
  IF workflow_json IS NULL OR jsonb_array_length(workflow_json) = 0 THEN
    SELECT p.phases INTO template_phases_fallback
    FROM public.projects p
    WHERE p.id = p_project_id;
    IF template_phases_fallback IS NOT NULL AND jsonb_array_length(COALESCE(template_phases_fallback, '[]'::jsonb)) > 0 THEN
      RETURN template_phases_fallback;
    END IF;
  END IF;

  RETURN COALESCE(workflow_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure create_project_run_snapshot uses get_project_workflow_with_standards so runs get standard + custom phases
-- First, drop ALL overloads so PostgREST can resolve the function unambiguously.
DROP FUNCTION IF EXISTS public.create_project_run_snapshot;

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
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_template_id) THEN
    RAISE EXCEPTION 'Template project not found: %', p_template_id;
  END IF;

  IF p_home_id IS NOT NULL THEN
    default_home_id := p_home_id;
  ELSE
    SELECT id INTO default_home_id
    FROM public.homes
    WHERE user_id = p_user_id
    ORDER BY created_at ASC
    LIMIT 1;
    IF default_home_id IS NULL THEN
      INSERT INTO public.homes (user_id, name, address)
      VALUES (p_user_id, 'My Home', '')
      RETURNING id INTO default_home_id;
    END IF;
  END IF;

  SELECT public.get_project_workflow_with_standards(p_template_id)
  INTO workflow_json;

  IF workflow_json IS NULL OR jsonb_array_length(workflow_json) = 0 THEN
    RAISE EXCEPTION 'Template has no phases. Cannot create project run without phases.';
  END IF;

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
    IF new_run_id IS NOT NULL THEN
      DELETE FROM public.project_runs WHERE id = new_run_id;
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
