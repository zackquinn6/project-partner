-- Migration: Link project templates to Standard Project operations without copying steps
-- Adds reference metadata to template_operations and rebuilds workflow JSON generators

-------------------------------
-- 1. Extend template_operations
-------------------------------
ALTER TABLE public.template_operations
  ADD COLUMN IF NOT EXISTS source_operation_id UUID REFERENCES public.template_operations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_reference BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_template_operations_source_operation
  ON public.template_operations(source_operation_id);

-------------------------------
-- 2. Backfill reference links
-------------------------------
DO $$
DECLARE
  standard_project CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  WITH standard_ops AS (
    SELECT id, name, standard_phase_id
    FROM public.template_operations
    WHERE project_id = standard_project
  )
  UPDATE public.template_operations tpl
  SET source_operation_id = std.id,
      is_reference = true
  FROM standard_ops std
  WHERE tpl.project_id <> standard_project
    AND tpl.standard_phase_id = std.standard_phase_id
    AND tpl.name = std.name
    AND COALESCE(tpl.is_custom_phase, false) = false
    AND tpl.source_operation_id IS DISTINCT FROM std.id;
END;
$$;

-- Remove duplicated steps/resources for reference operations (canonical source is standard project)
DELETE FROM public.workflow_step_materials
WHERE step_id IN (
  SELECT id FROM public.template_steps
  WHERE operation_id IN (
    SELECT id FROM public.template_operations WHERE is_reference = true
  )
);

DELETE FROM public.workflow_step_tools
WHERE step_id IN (
  SELECT id FROM public.template_steps
  WHERE operation_id IN (
    SELECT id FROM public.template_operations WHERE is_reference = true
  )
);

DELETE FROM public.workflow_step_outputs
WHERE step_id IN (
  SELECT id FROM public.template_steps
  WHERE operation_id IN (
    SELECT id FROM public.template_operations WHERE is_reference = true
  )
);

DELETE FROM public.template_steps
WHERE operation_id IN (
  SELECT id FROM public.template_operations WHERE is_reference = true
);

-------------------------------------------------------
-- 3. Helper function: fetch steps with relational data
-------------------------------------------------------
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
  FOR step_record IN
    SELECT ts.*
    FROM public.template_steps ts
    WHERE ts.operation_id = p_operation_id
    ORDER BY ts.display_order
  LOOP
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

    steps_json := steps_json || jsonb_build_object(
      'id', step_record.id,
      'step', step_record.step_title,
      'description', step_record.description,
      'estimatedTime', COALESCE(step_record.estimated_time_minutes, 0),
      'materials', materials_json,
      'tools', tools_json,
      'outputs', outputs_json,
      'inputs', inputs_json,
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

------------------------------------------------------------
-- 4. Rebuild workflow JSON (phases -> operations -> steps)
------------------------------------------------------------
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
      effective_operation_id := COALESCE(operation_record.source_operation_id, operation_record.id);

      steps_json := public.get_operation_steps_json(
        effective_operation_id,
        COALESCE(operation_record.is_reference, false)
      );

      operations_json := operations_json || jsonb_build_object(
        'id', operation_record.id,
        'name', COALESCE(operation_record.name, operation_record.source_name),
        'description', COALESCE(operation_record.description, operation_record.source_description),
        'flowType', COALESCE(operation_record.flow_type, operation_record.source_flow_type, 'prime'),
        'userPrompt', COALESCE(operation_record.user_prompt, operation_record.source_user_prompt),
        'alternateGroup', COALESCE(operation_record.alternate_group, operation_record.source_alternate_group),
        'steps', steps_json,
        'isStandard', COALESCE(operation_record.is_reference, false) OR phase_record.is_standard,
        'sourceOperationId', operation_record.source_operation_id
      );
    END LOOP;

    phases_json := phases_json || jsonb_build_object(
      'id', phase_record.id,
      'name', phase_record.name,
      'description', phase_record.description,
      'operations', operations_json,
      'isStandard', phase_record.is_standard
    );
  END LOOP;

  RETURN phases_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

---------------------------------------------------------
-- 5. Helper: build workflow JSON directly via RPC access
---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_project_workflow_json(p_project_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN public.rebuild_phases_json_from_project_phases(p_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

----------------------------------------------------------
-- 6. Update project creation to use reference operations
----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  project_name TEXT,
  project_description TEXT,
  project_category TEXT DEFAULT 'general',
  p_created_by UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  std_phase RECORD;
  new_phase_id UUID;
  std_operation RECORD;
BEGIN
  INSERT INTO public.projects (
    name,
    description,
    category,
    publish_status,
    created_by,
    is_current_version
  ) VALUES (
    project_name,
    project_description,
    project_category,
    'draft',
    p_created_by,
    true
  ) RETURNING id INTO new_project_id;

  FOR std_phase IN
    SELECT pp.*, sp.id AS standard_phase_lookup
    FROM public.project_phases pp
    JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
    WHERE pp.project_id = standard_project_id
    ORDER BY pp.display_order
  LOOP
    INSERT INTO public.project_phases (
      project_id,
      name,
      description,
      display_order,
      is_standard,
      standard_phase_id
    ) VALUES (
      new_project_id,
      std_phase.name,
      std_phase.description,
      std_phase.display_order,
      true,
      std_phase.standard_phase_id
    ) RETURNING id INTO new_phase_id;

    FOR std_operation IN
      SELECT *
      FROM public.template_operations
      WHERE project_id = standard_project_id
        AND phase_id = std_phase.id
      ORDER BY display_order
    LOOP
      INSERT INTO public.template_operations (
        project_id,
        phase_id,
        name,
        description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        standard_phase_id,
        source_operation_id,
        is_reference
      ) VALUES (
        new_project_id,
        new_phase_id,
        std_operation.name,
        std_operation.description,
        std_operation.flow_type,
        std_operation.user_prompt,
        std_operation.alternate_group,
        std_operation.display_order,
        std_operation.standard_phase_id,
        std_operation.id,
        true
      );
    END LOOP;
  END LOOP;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(new_project_id)
  WHERE id = new_project_id;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

------------------------------------------------------------
-- 7. Update revision + run snapshot helpers to honor refs
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_project_revision_v2(
  source_project_id UUID,
  revision_notes_text TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  phase_record RECORD;
  new_phase_id UUID;
  operation_record RECORD;
  new_operation_id UUID;
  step_record RECORD;
  new_step_id UUID;
BEGIN
  INSERT INTO public.projects (
    name,
    description,
    category,
    publish_status,
    parent_project_id,
    revision_notes,
    is_current_version,
    revision_number,
    created_by
  )
  SELECT
    CONCAT(name, ' (Revision ', COALESCE(revision_number + 1, 1), ')'),
    description,
    category,
    'draft',
    source_project_id,
    revision_notes_text,
    false,
    COALESCE(revision_number, 0) + 1,
    created_by
  FROM public.projects
  WHERE id = source_project_id
  RETURNING id INTO new_project_id;

  FOR phase_record IN
    SELECT *
    FROM public.project_phases
    WHERE project_id = source_project_id
    ORDER BY display_order
  LOOP
    INSERT INTO public.project_phases (
      project_id,
      name,
      description,
      display_order,
      is_standard,
      standard_phase_id
    ) VALUES (
      new_project_id,
      phase_record.name,
      phase_record.description,
      phase_record.display_order,
      phase_record.is_standard,
      phase_record.standard_phase_id
    ) RETURNING id INTO new_phase_id;

    FOR operation_record IN
      SELECT *
      FROM public.template_operations
      WHERE phase_id = phase_record.id
      ORDER BY display_order
    LOOP
      IF COALESCE(operation_record.is_reference, false) THEN
        INSERT INTO public.template_operations (
          project_id,
          phase_id,
          name,
          description,
          flow_type,
          user_prompt,
          alternate_group,
          display_order,
          standard_phase_id,
          source_operation_id,
          is_reference
        ) VALUES (
          new_project_id,
          new_phase_id,
          operation_record.name,
          operation_record.description,
          operation_record.flow_type,
          operation_record.user_prompt,
          operation_record.alternate_group,
          operation_record.display_order,
          operation_record.standard_phase_id,
          operation_record.source_operation_id,
          true
        ) RETURNING id INTO new_operation_id;
      ELSE
        INSERT INTO public.template_operations (
          project_id,
          phase_id,
          name,
          description,
          flow_type,
          user_prompt,
          alternate_group,
          display_order,
          standard_phase_id,
          custom_phase_name,
          custom_phase_description,
          custom_phase_display_order,
          is_reference
        ) VALUES (
          new_project_id,
          new_phase_id,
          operation_record.name,
          operation_record.description,
          operation_record.flow_type,
          operation_record.user_prompt,
          operation_record.alternate_group,
          operation_record.display_order,
          operation_record.standard_phase_id,
          operation_record.custom_phase_name,
          operation_record.custom_phase_description,
          operation_record.custom_phase_display_order,
          false
        ) RETURNING id INTO new_operation_id;

        FOR step_record IN
          SELECT *
          FROM public.template_steps
          WHERE operation_id = operation_record.id
          ORDER BY display_order
        LOOP
          INSERT INTO public.template_steps (
            operation_id,
            step_number,
            step_title,
            description,
            content_sections,
            apps,
            estimated_time_minutes,
            display_order,
            flow_type,
            step_type,
            step_type_id
          ) VALUES (
            new_operation_id,
            step_record.step_number,
            step_record.step_title,
            step_record.description,
            step_record.content_sections,
            step_record.apps,
            step_record.estimated_time_minutes,
            step_record.display_order,
            step_record.flow_type,
            step_record.step_type,
            step_record.step_type_id
          ) RETURNING id INTO new_step_id;

          INSERT INTO public.workflow_step_materials (
            step_id,
            legacy_material_id,
            name,
            description,
            category,
            unit,
            quantity,
            alternates,
            notes,
            metadata,
            display_order
          )
          SELECT
            new_step_id,
            legacy_material_id,
            name,
            description,
            category,
            unit,
            quantity,
            alternates,
            notes,
            metadata,
            display_order
          FROM public.workflow_step_materials
          WHERE step_id = step_record.id;

          INSERT INTO public.workflow_step_tools (
            step_id,
            legacy_tool_id,
            name,
            description,
            category,
            unit,
            quantity,
            alternates,
            notes,
            metadata,
            display_order
          )
          SELECT
            new_step_id,
            legacy_tool_id,
            name,
            description,
            category,
            unit,
            quantity,
            alternates,
            notes,
            metadata,
            display_order
          FROM public.workflow_step_tools
          WHERE step_id = step_record.id;

          INSERT INTO public.workflow_step_outputs (
            step_id,
            legacy_output_id,
            name,
            description,
            output_type,
            requirement,
            potential_effects,
            quality_checks,
            must_get_right,
            allowances,
            reference_specification,
            metadata,
            display_order
          )
          SELECT
            new_step_id,
            legacy_output_id,
            name,
            description,
            output_type,
            requirement,
            potential_effects,
            quality_checks,
            must_get_right,
            allowances,
            reference_specification,
            metadata,
            display_order
          FROM public.workflow_step_outputs
          WHERE step_id = step_record.id;

          INSERT INTO public.workflow_step_process_variables (
            step_id,
            variable_key,
            label,
            description,
            variable_type,
            required,
            unit,
            options,
            source_step_id,
            source_step_name,
            target_value,
            metadata,
            display_order
          )
          SELECT
            new_step_id,
            variable_key,
            label,
            description,
            variable_type,
            required,
            unit,
            options,
            source_step_id,
            source_step_name,
            target_value,
            metadata,
            display_order
          FROM public.workflow_step_process_variables
          WHERE step_id = step_record.id;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(new_project_id)
  WHERE id = new_project_id;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_template_id UUID,
  p_user_id UUID,
  p_run_name TEXT,
  p_home_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT now(),
  p_plan_end_date TIMESTAMPTZ DEFAULT (now() + interval '30 days')
) RETURNS UUID AS $$
DECLARE
  new_run_id UUID;
  template_project RECORD;
  complete_phases JSONB;
BEGIN
  IF auth.uid() <> p_user_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot create project runs for other users';
  END IF;

  SELECT * INTO template_project
  FROM public.projects
  WHERE id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template project not found';
  END IF;

  complete_phases := public.rebuild_phases_json_from_project_phases(p_template_id);

  INSERT INTO public.project_runs (
    template_id,
    user_id,
    name,
    description,
    home_id,
    status,
    start_date,
    plan_end_date,
    phases,
    category,
    difficulty,
    estimated_time,
    effort_level,
    skill_level,
    diy_length_challenges,
    completed_steps,
    progress
  ) VALUES (
    p_template_id,
    p_user_id,
    p_run_name,
    template_project.description,
    p_home_id,
    'not-started',
    p_start_date,
    p_plan_end_date,
    complete_phases,
    template_project.category,
    template_project.difficulty,
    template_project.estimated_time,
    template_project.effort_level,
    template_project.skill_level,
    template_project.diy_length_challenges,
    '[]'::jsonb,
    0
  )
  RETURNING id INTO new_run_id;

  RETURN new_run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---------------------------------------------------------
-- 8. Back-compat helper for dynamic standard aggregation
---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.build_phases_json_with_dynamic_standard(p_project_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN public.rebuild_phases_json_from_project_phases(p_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger rebuild for all existing projects to ensure phases JSON reflects references
UPDATE public.projects
SET phases = public.rebuild_phases_json_from_project_phases(id)
WHERE EXISTS (
  SELECT 1 FROM public.project_phases pp WHERE pp.project_id = projects.id
);

----------------------------------------------------------
-- 9. View: project_templates_live exposes dynamic phases
----------------------------------------------------------
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
  public.rebuild_phases_json_from_project_phases(p.id) AS phases
FROM public.projects p;

GRANT SELECT ON public.project_templates_live TO authenticated;
GRANT SELECT ON public.project_templates_live TO anon;


