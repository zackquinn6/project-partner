-- Create missing helper functions that are referenced but don't exist
-- These functions are called by the view or other functions

-- Helper function to get materials JSON for a step
CREATE OR REPLACE FUNCTION public.get_step_materials_json(p_step_id UUID)
RETURNS JSONB AS $$
DECLARE
  materials_json JSONB;
BEGIN
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
  WHERE wsm.step_id = p_step_id;
  
  RETURN COALESCE(materials_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get tools JSON for a step
CREATE OR REPLACE FUNCTION public.get_step_tools_json(p_step_id UUID)
RETURNS JSONB AS $$
DECLARE
  tools_json JSONB;
BEGIN
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
  WHERE wst.step_id = p_step_id;
  
  RETURN COALESCE(tools_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get outputs JSON for a step
CREATE OR REPLACE FUNCTION public.get_step_outputs_json(p_step_id UUID)
RETURNS JSONB AS $$
DECLARE
  outputs_json JSONB;
BEGIN
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
  WHERE wso.step_id = p_step_id;
  
  RETURN COALESCE(outputs_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get inputs (process variables) JSON for a step
CREATE OR REPLACE FUNCTION public.get_step_inputs_json(p_step_id UUID)
RETURNS JSONB AS $$
DECLARE
  inputs_json JSONB;
BEGIN
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
  WHERE wsp.step_id = p_step_id;
  
  RETURN COALESCE(inputs_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_step_materials_json IS 'Returns materials JSON for a given step ID from workflow_step_materials table';
COMMENT ON FUNCTION public.get_step_tools_json IS 'Returns tools JSON for a given step ID from workflow_step_tools table';
COMMENT ON FUNCTION public.get_step_outputs_json IS 'Returns outputs JSON for a given step ID from workflow_step_outputs table';
COMMENT ON FUNCTION public.get_step_inputs_json IS 'Returns inputs (process variables) JSON for a given step ID from workflow_step_process_variables table';

