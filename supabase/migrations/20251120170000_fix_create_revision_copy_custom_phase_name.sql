-- Fix create_project_revision_v2 to copy custom_phase_name to satisfy constraint
-- The constraint requires: (is_standard_phase = true AND custom_phase_name IS NULL) OR
--                         (is_standard_phase = false AND custom_phase_name IS NOT NULL)

CREATE OR REPLACE FUNCTION public.create_project_revision_v2(
  source_project_id UUID,
  revision_notes_text TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  source_project RECORD;
  phase_record RECORD;
  new_phase_id UUID;
  operation_record RECORD;
  new_operation_id UUID;
  step_record RECORD;
  parent_project_id_val UUID;
  max_revision_number INTEGER;
BEGIN
  IF source_project_id = '00000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'Cannot create revision of Standard Project Foundation';
  END IF;

  SELECT * INTO source_project FROM public.projects WHERE id = source_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found';
  END IF;

  parent_project_id_val := COALESCE(source_project.parent_project_id, source_project_id);

  SELECT COALESCE(MAX(revision_number), 0) + 1
  INTO max_revision_number
  FROM public.projects
  WHERE parent_project_id = parent_project_id_val OR id = parent_project_id_val;

  INSERT INTO public.projects (
    name,
    description,
    category,
    difficulty,
    effort_level,
    skill_level,
    estimated_time,
    estimated_time_per_unit,
    scaling_unit,
    item_type,
    project_challenges,
    project_type,
    publish_status,
    created_by,
    parent_project_id,
    revision_number,
    revision_notes,
    is_standard_template,
    is_current_version,
    cover_image,
    image,
    images
  ) VALUES (
    source_project.name,
    source_project.description,
    source_project.category,
    source_project.difficulty,
    source_project.effort_level,
    source_project.skill_level,
    source_project.estimated_time,
    source_project.estimated_time_per_unit,
    source_project.scaling_unit,
    source_project.item_type,
    source_project.project_challenges,
    source_project.project_type,
    'draft',
    auth.uid(),
    parent_project_id_val,
    max_revision_number,
    revision_notes_text,
    false,
    true,
    source_project.cover_image,
    source_project.image,
    source_project.images
  ) RETURNING id INTO new_project_id;

  UPDATE public.projects
  SET publish_status = 'archived',
      is_current_version = false
  WHERE id = source_project_id;

  FOR phase_record IN
    SELECT * FROM public.project_phases
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
      SELECT * FROM public.template_operations
      WHERE project_id = source_project_id
        AND phase_id = phase_record.id
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
        dependent_on,
        is_standard_phase,
        custom_phase_name,
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
        operation_record.dependent_on,
        operation_record.is_standard_phase,
        operation_record.custom_phase_name,
        operation_record.source_operation_id,
        operation_record.is_reference
      ) RETURNING id INTO new_operation_id;

      FOR step_record IN
        SELECT * FROM public.template_steps
        WHERE operation_id = operation_record.id
        ORDER BY display_order, step_number
      LOOP
        INSERT INTO public.template_steps (
          operation_id,
          step_number,
          step_title,
          description,
          flow_type,
          step_type,
          content_sections,
          materials,
          tools,
          outputs,
          apps,
          estimated_time_minutes,
          display_order
        ) VALUES (
          new_operation_id,
          step_record.step_number,
          step_record.step_title,
          step_record.description,
          step_record.flow_type,
          step_record.step_type,
          step_record.content_sections,
          step_record.materials,
          step_record.tools,
          step_record.outputs,
          step_record.apps,
          step_record.estimated_time_minutes,
          step_record.display_order
        );
      END LOOP;
    END LOOP;
  END LOOP;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(new_project_id)
  WHERE id = new_project_id;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

