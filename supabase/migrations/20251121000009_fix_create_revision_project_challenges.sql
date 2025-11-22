-- Fix create_project_revision_v2 to use project_challenges instead of diy_length_challenges
-- The column was renamed from diy_length_challenges to project_challenges in earlier migrations

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
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Prevent revisions of Standard Project
  IF source_project_id = standard_project_id THEN
    RAISE EXCEPTION 'Cannot create revision of Standard Project Foundation';
  END IF;
  
  -- Get source project
  SELECT * INTO source_project FROM projects WHERE id = source_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found';
  END IF;
  
  -- Determine parent project ID
  parent_project_id_val := COALESCE(source_project.parent_project_id, source_project_id);
  
  -- Calculate revision number: MAX across all revisions of the same parent + 1
  SELECT COALESCE(MAX(revision_number), 0) + 1
  INTO max_revision_number
  FROM projects
  WHERE parent_project_id = parent_project_id_val OR id = parent_project_id_val;
  
  RAISE NOTICE 'Creating revision % for parent project %', max_revision_number, parent_project_id_val;
  
  -- Create new project (revision)
  INSERT INTO projects (
    name,
    description,
    category,
    difficulty,
    effort_level,
    skill_level,
    estimated_time,
    estimated_time_per_unit,
    scaling_unit,
    project_challenges,
    publish_status,
    created_by,
    parent_project_id,
    revision_number,
    revision_notes,
    is_standard_template,
    is_current_version,
    estimated_total_time,
    typical_project_size
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
    source_project.project_challenges,
    'draft',
    auth.uid(),
    parent_project_id_val,
    max_revision_number,
    revision_notes_text,
    false,
    true,
    source_project.estimated_total_time,
    source_project.typical_project_size
  ) RETURNING id INTO new_project_id;
  
  -- Archive source project (but keep it, don't delete)
  UPDATE projects
  SET is_current_version = false
  WHERE id = source_project_id;
  
  -- Only copy CUSTOM phases (is_standard = false) - standard phases remain dynamically linked
  FOR phase_record IN
    SELECT *
    FROM public.project_phases
    WHERE project_id = source_project_id
      AND is_standard = false
    ORDER BY display_order
  LOOP
    -- Insert custom phase into new revision
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
      false,
      NULL
    ) RETURNING id INTO new_phase_id;
    
    -- Copy operations for this custom phase
    FOR operation_record IN
      SELECT *
      FROM public.template_operations
      WHERE project_id = source_project_id
        AND phase_id = phase_record.id
      ORDER BY display_order
    LOOP
      -- Insert operation
      INSERT INTO public.template_operations (
        project_id,
        phase_id,
        name,
        description,
        display_order,
        flow_type,
        alternate_group,
        user_prompt,
        dependent_on,
        custom_phase_name,
        custom_phase_description,
        custom_phase_display_order,
        is_standard_phase
      ) VALUES (
        new_project_id,
        new_phase_id,
        operation_record.name,
        operation_record.description,
        operation_record.display_order,
        operation_record.flow_type,
        operation_record.alternate_group,
        operation_record.user_prompt,
        operation_record.dependent_on,
        phase_record.name,
        phase_record.description,
        phase_record.display_order,
        false
      ) RETURNING id INTO new_operation_id;
      
      -- Copy steps for this operation
      FOR step_record IN
        SELECT *
        FROM public.template_steps
        WHERE operation_id = operation_record.id
        ORDER BY display_order, step_number
      LOOP
        INSERT INTO public.template_steps (
          operation_id,
          step_title,
          description,
          display_order,
          step_number,
          estimated_time_minutes,
          flow_type,
          step_type,
          content_sections,
          skill_level,
          workers_needed,
          time_estimate_low,
          time_estimate_medium,
          time_estimate_high
        ) VALUES (
          new_operation_id,
          step_record.step_title,
          step_record.description,
          step_record.display_order,
          step_record.step_number,
          step_record.estimated_time_minutes,
          step_record.flow_type,
          step_record.step_type,
          step_record.content_sections,
          step_record.skill_level,
          step_record.workers_needed,
          step_record.time_estimate_low,
          step_record.time_estimate_medium,
          step_record.time_estimate_high
        );
      END LOOP;
    END LOOP;
  END LOOP;
  
  -- Rebuild phases JSON for the new revision
  -- This will dynamically include standard phases from Standard Project Foundation
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(new_project_id, NULL)
  WHERE id = new_project_id;
  
  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_project_revision_v2(UUID, TEXT) IS 
'Creates a new revision of a project. Only copies CUSTOM phases (is_standard = false) into project_phases. Standard phases remain dynamically linked from Standard Project Foundation via rebuild_phases_json_from_project_phases. This ensures automatic updates when Standard Project Foundation changes. Uses project_challenges column (not diy_length_challenges).';

