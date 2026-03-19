-- Fix workflow snapshot pipeline: read canonical workflow from operation_steps + phase_operations
-- (not template_steps / template_operations). Structure Manager and Edit Workflow persist to
-- operation_steps; project runs use get_project_workflow_with_standards → rebuild_phases_json_from_project_phases
-- → get_operation_steps_json. Without this fix, apps and other step fields edited on Standard Project
-- Foundation never appear in new project runs.
--
-- Run in Supabase SQL editor after review.

-- ---------------------------------------------------------------------------
-- Step JSON for one phase_operations row (matches app / UserView expectations)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_operation_steps_json(
  p_operation_id UUID,
  p_is_reference BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  steps_json JSONB;
BEGIN
  SELECT COALESCE(
    (
      SELECT jsonb_agg(step_obj)
      FROM (
        SELECT jsonb_build_object(
          'id', s.id,
          'step', s.step_title,
          'description', s.description,
          'stepType', s.step_type,
          'flowType', s.flow_type,
          'timeEstimateLow', s.time_estimate_low,
          'timeEstimateMedium', s.time_estimate_med,
          'timeEstimateHigh', s.time_estimate_high,
          'contentSections', s.content_sections,
          'content', s.content,
          'materials', s.materials,
          'tools', s.tools,
          'apps', s.apps,
          'outputs', s.outputs,
          'displayOrder', s.display_order,
          'allowContentEdit', s.allow_content_edit,
          'skillLevel', s.skill_level,
          'numberOfWorkers', s.number_of_workers
        ) AS step_obj
        FROM public.operation_steps s
        WHERE s.operation_id = p_operation_id
        ORDER BY s.display_order NULLS LAST, s.created_at
      ) ordered_rows
    ),
    '[]'::jsonb
  )
  INTO steps_json;

  RETURN steps_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- Full phases JSON from project_phases + phase_operations + operation_steps
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  phases_json JSONB := '[]'::jsonb;
  phase_record RECORD;
  operations_json JSONB;
  operation_record RECORD;
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
      pp.position_value,
      pp.source_project_id,
      pp.is_linked
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
        op.phase_id,
        op.operation_name,
        op.operation_description,
        op.flow_type,
        op.display_order,
        op.estimated_time
      FROM public.phase_operations op
      WHERE op.phase_id = phase_record.id
      ORDER BY op.display_order NULLS LAST, op.created_at
    LOOP
      steps_json := public.get_operation_steps_json(operation_record.id, false);

      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', operation_record.id,
          'name', operation_record.operation_name,
          'description', operation_record.operation_description,
          'flowType', COALESCE(operation_record.flow_type, 'prime'),
          'userPrompt', NULL,
          'alternateGroup', NULL,
          'estimatedTime', operation_record.estimated_time,
          'steps', COALESCE(steps_json, '[]'::jsonb),
          'isStandard', COALESCE(phase_record.is_standard, false),
          'sourceOperationId', NULL
        )
      );
    END LOOP;

    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', COALESCE(phase_record.is_standard, false),
        'isLinked', COALESCE(phase_record.is_linked, false) OR (phase_record.source_project_id IS NOT NULL),
        'sourceProjectId', phase_record.source_project_id,
        'phaseOrderNumber',
          CASE
            WHEN phase_record.position_rule = 'last' THEN '"last"'::jsonb
            WHEN phase_record.position_rule = 'nth' AND phase_record.position_value IS NOT NULL
              THEN to_jsonb(phase_record.position_value)
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

-- ---------------------------------------------------------------------------
-- create_project_run_snapshot_v2: snapshot via get_project_workflow_with_standards
-- If your database already has a richer v2 (extra columns, side effects), merge this
-- body with yours instead of replacing blindly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_project_run_snapshot_v2(
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
