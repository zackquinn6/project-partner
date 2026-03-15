-- Project catalog / start project: ensure compiled workflow (standard foundation + custom phases) is used.
-- Creates or replaces: get_project_workflow_with_standards, get_operation_steps_json,
-- rebuild_phases_json_from_project_phases, create_project_run_snapshot.
-- Apply this if starting a published project fails with "Template has no phases".
-- Requires: projects (is_standard_template), project_phases, template_operations, template_steps.

-- ============================================
-- PART 1: get_project_workflow_with_standards
-- ============================================
-- Returns standard phases (from Standard Project Foundation) + custom phases for the template.

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
  SELECT COALESCE(p.is_standard_template, false) INTO is_standard_template
  FROM public.projects p
  WHERE p.id = p_project_id;

  IF is_standard_template = true OR p_project_id = standard_project_id THEN
    SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
    INTO workflow_json;
    RETURN COALESCE(workflow_json, '[]'::jsonb);
  END IF;

  SELECT public.rebuild_phases_json_from_project_phases(standard_project_id)
  INTO standard_phases_json;

  SELECT
    COALESCE(jsonb_agg(phase), '[]'::jsonb)
  INTO custom_phases_json
  FROM (
    SELECT public.rebuild_phases_json_from_project_phases(p_project_id) as all_phases
  ) phases_data,
  jsonb_array_elements(phases_data.all_phases) as phase
  WHERE (phase->>'isStandard')::boolean = false
     OR phase->>'isStandard' IS NULL;

  workflow_json := COALESCE(standard_phases_json, '[]'::jsonb) || COALESCE(custom_phases_json, '[]'::jsonb);
  RETURN COALESCE(workflow_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 1.5: get_operation_steps_json
-- ============================================
CREATE OR REPLACE FUNCTION public.get_operation_steps_json(
  p_operation_id UUID,
  p_is_reference BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  steps_json JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(step_obj ORDER BY (step_obj->>'displayOrder')::int NULLS LAST), '[]'::jsonb)
  INTO steps_json
  FROM (
    SELECT jsonb_build_object(
      'id', ts.id,
      'step', ts.step_title,
      'description', ts.description,
      'stepType', ts.step_type,
      'stepTypeId', ts.step_type_id,
      'flowType', ts.flow_type,
      'timeEstimateLow', ts.time_estimate_low,
      'timeEstimateMedium', ts.time_estimate_medium,
      'timeEstimateHigh', ts.time_estimate_high,
      'contentSections', ts.content_sections,
      'materials', ts.materials,
      'tools', ts.tools,
      'apps', ts.apps,
      'outputs', ts.outputs,
      'displayOrder', ts.display_order
    ) as step_obj
    FROM public.template_steps ts
    WHERE ts.operation_id = p_operation_id
    ORDER BY ts.display_order
  ) ordered_steps;

  RETURN COALESCE(steps_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PART 1.6: rebuild_phases_json_from_project_phases
-- ============================================
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
      pp.position_rule,
      pp.position_value
    FROM public.project_phases pp
    WHERE pp.project_id = p_project_id
    ORDER BY
      CASE
        WHEN pp.position_rule = 'nth' THEN COALESCE(pp.position_value, 999)
        WHEN pp.position_rule = 'last' THEN 2147483647
        ELSE 999
      END ASC,
      pp.created_at ASC
  LOOP
    operations_json := '[]'::jsonb;

    FOR operation_record IN
      SELECT
        op.id,
        op.project_id,
        op.phase_id,
        op.operation_name,
        op.operation_description,
        op.flow_type,
        op.user_prompt,
        op.alternate_group,
        op.display_order,
        op.source_operation_id,
        op.is_reference,
        src.operation_name AS source_operation_name,
        src.operation_description AS source_operation_description,
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
          'name', COALESCE(operation_record.operation_name, operation_record.source_operation_name),
          'description', COALESCE(operation_record.operation_description, operation_record.source_operation_description),
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

  RETURN phases_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PART 2: create_project_run_snapshot
-- ============================================
-- Uses get_project_workflow_with_standards so runs get standard + custom phases.

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
    ORDER BY COALESCE(is_primary, false) DESC, created_at ASC
    LIMIT 1;

    IF default_home_id IS NULL THEN
      INSERT INTO public.homes (user_id, name)
      VALUES (p_user_id, 'My Home')
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
