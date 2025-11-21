-- Update get_operation_steps_json to include time estimates from database columns
-- This ensures time estimates are loaded from time_estimate_low/medium/high columns

CREATE OR REPLACE FUNCTION public.get_operation_steps_json(
  p_operation_id UUID,
  p_is_standard BOOLEAN default false
) RETURNS JSONB AS $$
DECLARE
  steps_json JSONB := '[]'::jsonb;
  step_record RECORD;
  materials_json JSONB;
  tools_json JSONB;
  outputs_json JSONB;
  inputs_json JSONB;
  apps_json JSONB;
  app_obj JSONB;
  app_override RECORD;
  time_estimation_json JSONB;
BEGIN
  -- If no steps found, return empty array (don't fail)
  FOR step_record IN
    SELECT ts.*
    FROM public.template_steps ts
    WHERE ts.operation_id = p_operation_id
    ORDER BY ts.display_order, ts.step_number
  LOOP
    -- Get materials from workflow_step_materials (new relational table)
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', COALESCE(wsm.legacy_material_id, wsm.id::text),
        'name', wsm.name,
        'description', wsm.description,
        'category', wsm.category,
        'unit', wsm.unit,
        'quantity', wsm.quantity,
        'alternates', wsm.alternates,
        'notes', wsm.notes,
        'metadata', wsm.metadata
      ) ORDER BY wsm.display_order
    ), '[]'::jsonb)
    INTO materials_json
    FROM public.workflow_step_materials wsm
    WHERE wsm.step_id = step_record.id;

    -- Get tools from workflow_step_tools (new relational table)
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', COALESCE(wst.legacy_tool_id, wst.id::text),
        'name', wst.name,
        'description', wst.description,
        'category', wst.category,
        'unit', wst.unit,
        'quantity', wst.quantity,
        'alternates', wst.alternates,
        'notes', wst.notes,
        'metadata', wst.metadata
      ) ORDER BY wst.display_order
    ), '[]'::jsonb)
    INTO tools_json
    FROM public.workflow_step_tools wst
    WHERE wst.step_id = step_record.id;

    -- Get outputs from workflow_step_outputs (new relational table)
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wso.id,
        'name', wso.name,
        'description', wso.description,
        'type', wso.output_type,
        'required', wso.required,
        'metadata', wso.metadata
      ) ORDER BY wso.display_order
    ), '[]'::jsonb)
    INTO outputs_json
    FROM public.workflow_step_outputs wso
    WHERE wso.step_id = step_record.id;

    -- Get process variables from workflow_step_process_variables (new relational table)
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', wsp.id,
        'key', wsp.variable_key,
        'name', wsp.label,
        'description', wsp.description,
        'type', wsp.variable_type,
        'required', wsp.required,
        'unit', wsp.unit,
        'options', wsp.options,
        'sourceStepId', wsp.source_step_id,
        'sourceStepName', wsp.source_step_name,
        'targetValue', wsp.target_value,
        'metadata', wsp.metadata
      ) ORDER BY wsp.display_order
    ), '[]'::jsonb)
    INTO inputs_json
    FROM public.workflow_step_process_variables wsp
    WHERE wsp.step_id = step_record.id;

    -- Build apps JSON with app overrides
    apps_json := '[]'::jsonb;
    IF step_record.apps IS NOT NULL AND jsonb_typeof(step_record.apps) = 'array' THEN
      FOR app_obj IN SELECT * FROM jsonb_array_elements(step_record.apps)
      LOOP
        -- Check for app override
        SELECT * INTO app_override
        FROM public.app_overrides
        WHERE app_key = app_obj->>'key'
        LIMIT 1;

        IF FOUND THEN
          apps_json := apps_json || jsonb_build_object(
            'key', app_obj->>'key',
            'name', app_override.display_name,
            'description', COALESCE(app_override.description, app_obj->>'description'),
            'url', app_obj->>'url',
            'icon', app_obj->>'icon'
          );
        ELSE
          apps_json := apps_json || app_obj;
        END IF;
      END LOOP;
    END IF;

    -- Build time estimation JSON from database columns
    -- If columns exist, use them; otherwise fall back to JSON if present
    IF step_record.time_estimate_low IS NOT NULL OR 
       step_record.time_estimate_medium IS NOT NULL OR 
       step_record.time_estimate_high IS NOT NULL THEN
      time_estimation_json := jsonb_build_object(
        'variableTime', jsonb_build_object(
          'low', COALESCE(step_record.time_estimate_low, 0),
          'medium', COALESCE(step_record.time_estimate_medium, 0),
          'high', COALESCE(step_record.time_estimate_high, 0)
        )
      );
    ELSIF step_record.content_sections::text LIKE '%"timeEstimation"%' THEN
      -- Fallback to JSON if columns are null but JSON exists
      time_estimation_json := step_record.content_sections->'timeEstimation';
    ELSIF step_record.materials::text LIKE '%"timeEstimation"%' THEN
      -- Another fallback location
      time_estimation_json := step_record.materials->'timeEstimation';
    ELSE
      time_estimation_json := NULL;
    END IF;

    -- Build step JSON - use legacy JSON fields as fallback if relational tables are empty
    steps_json := steps_json || jsonb_build_object(
      'id', step_record.id,
      'step', step_record.step_title,
      'description', step_record.description,
      'estimatedTime', COALESCE(step_record.estimated_time_minutes, 0),
      'materials', COALESCE(materials_json, step_record.materials, '[]'::jsonb),
      'tools', COALESCE(tools_json, step_record.tools, '[]'::jsonb),
      'outputs', COALESCE(outputs_json, step_record.outputs, '[]'::jsonb),
      'inputs', COALESCE(inputs_json, '[]'::jsonb),
      'apps', COALESCE(apps_json, step_record.apps, '[]'::jsonb),
      'content', COALESCE(step_record.content_sections, '[]'::jsonb),
      'contentType', 'multi',
      'flowType', COALESCE(step_record.flow_type, 'prime'),
      'stepType', COALESCE(step_record.step_type, 'prime'),
      'timeEstimation', time_estimation_json,
      'workersNeeded', COALESCE(step_record.workers_needed, 1),
      'skillLevel', step_record.skill_level,
      'isStandard', p_is_standard
    );
  END LOOP;

  RETURN steps_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

