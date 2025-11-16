-- Fix workflow steps not loading after reference operations migration
-- This ensures steps are correctly fetched for both regular and reference operations

-- Fix get_operation_steps_json to handle cases where steps might be missing
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
BEGIN
  -- If no steps found, return empty array (don't fail)
  FOR step_record IN
    SELECT ts.*
    FROM public.template_steps ts
    WHERE ts.operation_id = p_operation_id
    ORDER BY ts.display_order
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

    -- Build step JSON - use legacy JSON fields as fallback if relational tables are empty
    steps_json := steps_json || jsonb_build_object(
      'id', step_record.id,
      'step', step_record.step_title,
      'description', step_record.description,
      'estimatedTime', COALESCE(step_record.estimated_time_minutes, 0),
      'materials', COALESCE(materials_json, step_record.materials, '[]'::jsonb),
      'tools', COALESCE(tools_json, step_record.tools, '[]'::jsonb),
      'outputs', COALESCE(outputs_json, step_record.outputs, '[]'::jsonb),
      'inputs', COALESCE(inputs_json, step_record.process_variables, '[]'::jsonb),
      'apps', COALESCE(step_record.apps, '[]'::jsonb),
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

-- Ensure rebuild_phases_json_from_project_phases handles empty operations gracefully
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
    SELECT *
    FROM public.project_phases
    WHERE project_id = p_project_id
    ORDER BY display_order
  LOOP
    operations_json := '[]'::jsonb;

    FOR operation_record IN
      SELECT op.*,
             src.name AS source_name,
             src.description AS source_description,
             src.flow_type AS source_flow_type,
             src.user_prompt AS source_user_prompt,
             src.alternate_group AS source_alternate_group
      FROM public.template_operations op
      LEFT JOIN public.template_operations src ON op.source_operation_id = src.id
      WHERE op.phase_id = phase_record.id
      ORDER BY op.display_order
    LOOP
      -- For reference operations, use source operation ID to get steps
      effective_operation_id := COALESCE(operation_record.source_operation_id, operation_record.id);

      -- Get steps from the effective operation (source if reference, self if not)
      steps_json := public.get_operation_steps_json(
        effective_operation_id,
        COALESCE(operation_record.is_reference, false)
      );

      -- Always add the operation, even if it has no steps (to preserve structure)
      -- Empty steps array is valid - operations can exist without steps
      -- CRITICAL FIX: Use jsonb_build_array to wrap object, then concatenate arrays
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

    -- Always add phase (same as original - no filtering)
    -- CRITICAL FIX: Use jsonb_build_array to wrap object, then concatenate arrays
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

-- Refresh the view to ensure it uses the updated functions
CREATE OR REPLACE VIEW public.project_templates_live AS
SELECT
  p.id,
  p.name,
  p.description,
  p.diy_length_challenges,
  p.image,
  p.images,
  p.cover_image,
  p.category,
  p.difficulty,
  p.effort_level,
  p.skill_level,
  p.estimated_time,
  p.estimated_time_per_unit,
  p.scaling_unit,
  p.publish_status,
  p.published_at,
  p.beta_released_at,
  p.archived_at,
  p.release_notes,
  p.revision_notes,
  p.revision_number,
  p.parent_project_id,
  p.created_from_revision,
  p.is_standard_template,
  p.is_current_version,
  p.phase_revision_alerts,
  p.owner_id,
  p.created_by,
  p.created_at,
  p.updated_at,
  p.start_date,
  p.plan_end_date,
  p.end_date,
  COALESCE(
    public.rebuild_phases_json_from_project_phases(p.id),
    '[]'::jsonb
  ) AS phases
FROM public.projects p;

GRANT SELECT ON public.project_templates_live TO authenticated;
GRANT SELECT ON public.project_templates_live TO anon;

-- Create missing RPC function that the frontend expects
CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(p_project_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- Return the phases JSON from rebuild_phases_json_from_project_phases
  -- This already handles standard operations via source_operation_id
  RETURN COALESCE(
    public.rebuild_phases_json_from_project_phases(p_project_id),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
