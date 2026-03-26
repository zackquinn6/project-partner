-- Fix: project revisions must copy phases as editable (not linked-to-prior-revision).
-- Revisions remain grouped by parent_project_id.

CREATE OR REPLACE FUNCTION public.create_project_revision_v2(
  p_source_project_id uuid,
  new_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source public.projects%ROWTYPE;
  v_parent_project_id uuid;
  v_new_project_id uuid;
  v_new_revision_number integer;
  v_pp record;
  v_po record;
  v_os record;
  v_new_phase_id uuid;
  v_new_operation_id uuid;
BEGIN
  SELECT *
  INTO v_source
  FROM public.projects
  WHERE id = p_source_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'create_project_revision_v2: source project not found: %', p_source_project_id;
  END IF;

  IF v_source.revision_number IS NULL THEN
    RAISE EXCEPTION 'create_project_revision_v2: source project has NULL revision_number: %', p_source_project_id;
  END IF;

  v_parent_project_id := CASE
    WHEN v_source.parent_project_id IS NULL THEN v_source.id
    ELSE v_source.parent_project_id
  END;

  -- Avoid hardcoded fallbacks: require at least the source's revision_number to exist.
  SELECT (MAX(p.revision_number) + 1)
  INTO v_new_revision_number
  FROM public.projects p
  WHERE p.id = v_parent_project_id OR p.parent_project_id = v_parent_project_id;

  IF v_new_revision_number IS NULL THEN
    RAISE EXCEPTION 'create_project_revision_v2: failed to compute new revision_number for parent_project_id %', v_parent_project_id;
  END IF;

  INSERT INTO public.projects (
    name,
    description,
    icon,
    category,
    effort_level,
    skill_level,
    estimated_time,
    estimated_cost,
    estimated_total_time,
    scaling_unit,
    typical_project_size,
    budget_per_unit,
    budget_per_typical_size,
    tags,
    item_type,
    project_type,
    publish_status,
    visibility_status,
    images,
    cover_image,
    instructions_data_sources,
    project_challenges,
    phases,
    user_id,
    is_standard,
    parent_project_id,
    revision_number,
    revision_notes
  )
  VALUES (
    new_name,
    v_source.description,
    v_source.icon,
    v_source.category,
    v_source.effort_level,
    v_source.skill_level,
    v_source.estimated_time,
    v_source.estimated_cost,
    v_source.estimated_total_time,
    v_source.scaling_unit,
    v_source.typical_project_size,
    v_source.budget_per_unit,
    v_source.budget_per_typical_size,
    v_source.tags,
    v_source.item_type,
    v_source.project_type,
    'draft',
    v_source.visibility_status,
    v_source.images,
    v_source.cover_image,
    v_source.instructions_data_sources,
    v_source.project_challenges,
    v_source.phases,
    v_source.user_id,
    v_source.is_standard,
    v_parent_project_id,
    v_new_revision_number,
    NULL
  )
  RETURNING id INTO v_new_project_id;

  -- Relational workflow copy (project_phases -> phase_operations -> operation_steps)
  CREATE TEMP TABLE tmp_phase_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE tmp_op_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;

  FOR v_pp IN
    SELECT *
    FROM public.project_phases
    WHERE project_id = p_source_project_id
    ORDER BY display_order ASC
  LOOP
    INSERT INTO public.project_phases (
      project_id,
      name,
      description,
      display_order,
      position_rule,
      position_value,
      is_standard,
      is_linked,
      source_project_id
    )
    VALUES (
      v_new_project_id,
      v_pp.name,
      v_pp.description,
      v_pp.display_order,
      v_pp.position_rule,
      v_pp.position_value,
      v_pp.is_standard,
      CASE
        -- Critical fix: phases copied from the prior revision should not be marked as linked.
        WHEN v_pp.source_project_id = p_source_project_id THEN FALSE
        ELSE v_pp.is_linked
      END,
      CASE
        WHEN v_pp.source_project_id = p_source_project_id THEN NULL
        ELSE v_pp.source_project_id
      END
    )
    RETURNING id INTO v_new_phase_id;

    INSERT INTO tmp_phase_map (old_id, new_id)
    VALUES (v_pp.id, v_new_phase_id);
  END LOOP;

  FOR v_po IN
    SELECT po.*
    FROM public.phase_operations po
    INNER JOIN tmp_phase_map pm ON pm.old_id = po.phase_id
    ORDER BY po.display_order ASC
  LOOP
    INSERT INTO public.phase_operations (
      phase_id,
      operation_name,
      operation_description,
      display_order,
      estimated_time,
      flow_type
    )
    VALUES (
      (SELECT pm.new_id FROM tmp_phase_map pm WHERE pm.old_id = v_po.phase_id),
      v_po.operation_name,
      v_po.operation_description,
      v_po.display_order,
      v_po.estimated_time,
      v_po.flow_type
    )
    RETURNING id INTO v_new_operation_id;

    INSERT INTO tmp_op_map (old_id, new_id)
    VALUES (v_po.id, v_new_operation_id);
  END LOOP;

  FOR v_os IN
    SELECT os.*
    FROM public.operation_steps os
    INNER JOIN tmp_op_map om ON om.old_id = os.operation_id
    ORDER BY os.display_order ASC
  LOOP
    INSERT INTO public.operation_steps (
      operation_id,
      step_title,
      description,
      display_order,
      flow_type,
      step_type,
      skill_level,
      number_of_workers,
      time_estimate_low,
      time_estimate_med,
      time_estimate_high,
      allow_content_edit,
      content_type,
      content,
      content_sections,
      tools,
      materials,
      outputs,
      apps
    )
    VALUES (
      (SELECT om.new_id FROM tmp_op_map om WHERE om.old_id = v_os.operation_id),
      v_os.step_title,
      v_os.description,
      v_os.display_order,
      v_os.flow_type,
      v_os.step_type,
      v_os.skill_level,
      v_os.number_of_workers,
      v_os.time_estimate_low,
      v_os.time_estimate_med,
      v_os.time_estimate_high,
      v_os.allow_content_edit,
      v_os.content_type,
      v_os.content,
      v_os.content_sections,
      v_os.tools,
      v_os.materials,
      v_os.outputs,
      v_os.apps
    );
  END LOOP;

  RETURN v_new_project_id;
END;
$$;

