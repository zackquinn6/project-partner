-- Update get_operation_steps_json to apply app overrides dynamically
-- This ensures app names from app_overrides table are used when building step JSON

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
        'id', COALESCE(wso.legacy_output_id, wso.id::text),
        'name', wso.name,
        'description', wso.description,
        'type', wso.output_type,
        'requirement', wso.requirement,
        'potentialEffects', wso.potential_effects,
        'qualityChecks', wso.quality_checks,
        'mustGetRight', wso.must_get_right,
        'allowances', wso.allowances,
        'referenceSpecification', wso.reference_specification,
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

    -- Process apps and apply overrides dynamically
    apps_json := '[]'::jsonb;
    IF step_record.apps IS NOT NULL AND jsonb_typeof(step_record.apps) = 'array' THEN
      FOR i IN 0..jsonb_array_length(step_record.apps) - 1 LOOP
        app_obj := step_record.apps->i;
        
        -- Check for app override by app.id or actionKey
        SELECT * INTO app_override
        FROM public.app_overrides
        WHERE app_id = app_obj->>'id'
           OR app_id = app_obj->>'actionKey'
           OR app_id = REPLACE(app_obj->>'id', 'app-', '')
           OR (app_obj->>'actionKey' IS NOT NULL AND app_id = app_obj->>'actionKey');
        
        IF FOUND THEN
          -- Apply override - use app_name from app_overrides table
          apps_json := apps_json || jsonb_build_object(
            'id', COALESCE(app_obj->>'id', CONCAT('app-', app_override.app_id)),
            'appName', app_override.app_name,  -- DYNAMIC: Use name from app_overrides
            'appType', COALESCE(app_obj->>'appType', 'native'),
            'icon', COALESCE(app_override.icon, app_obj->>'icon', 'Sparkles'),
            'description', COALESCE(app_override.description, app_obj->>'description', ''),
            'actionKey', COALESCE(app_obj->>'actionKey', app_override.app_id),
            'displayOrder', COALESCE((app_obj->>'displayOrder')::INTEGER, COALESCE(app_override.display_order, 1)),
            'embedUrl', app_obj->>'embedUrl',
            'linkUrl', app_obj->>'linkUrl',
            'openInNewTab', (app_obj->>'openInNewTab')::BOOLEAN,
            'isBeta', (app_obj->>'isBeta')::BOOLEAN
          );
        ELSE
          -- Keep original app (no override found)
          apps_json := apps_json || app_obj;
        END IF;
      END LOOP;
    END IF;

    -- Build step JSON - use legacy JSON fields as fallback if relational tables are empty
    -- DYNAMIC APPS: Apps now use app_name from app_overrides table if override exists
    steps_json := steps_json || jsonb_build_object(
      'id', step_record.id,
      'step', step_record.step_title,
      'description', step_record.description,
      'estimatedTime', COALESCE(step_record.estimated_time_minutes, 0),
      'materials', COALESCE(materials_json, step_record.materials, '[]'::jsonb),
      'tools', COALESCE(tools_json, step_record.tools, '[]'::jsonb),
      'outputs', COALESCE(outputs_json, step_record.outputs, '[]'::jsonb),
      'inputs', COALESCE(inputs_json, '[]'::jsonb),
      'apps', apps_json,  -- DYNAMIC: Uses app names from app_overrides if available
      'content', COALESCE(step_record.content_sections, '[]'::jsonb),
      'contentType', 'multi',
      'flowType', COALESCE(step_record.flow_type, 'prime'),
      'stepType', COALESCE(step_record.step_type, 'prime'),
      'isStandard', p_is_standard
    );
  END LOOP;

  RETURN steps_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_operation_steps_json IS 'Builds step JSON with dynamically linked app names from app_overrides table. Ensures project templates always show latest app names.';

