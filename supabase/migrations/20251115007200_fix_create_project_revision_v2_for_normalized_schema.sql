-- Fix create_project_revision_v2 to work with normalized phase_id schema
-- Operations now use phase_id only (no standard_phase_id)
-- Also fix revision number calculation to use MAX across all parent revisions

CREATE OR REPLACE FUNCTION create_project_revision_v2(
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
  -- Prevent revisions of Standard Project
  IF source_project_id = '00000000-0000-0000-0000-000000000001' THEN
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
  
  -- Create new project (revision) - using normalized schema
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
    diy_length_challenges,
    publish_status,
    created_by,
    parent_project_id,
    revision_number,
    revision_notes,
    is_standard_template,
    is_current_version
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
    source_project.diy_length_challenges,
    'draft',
    auth.uid(),
    parent_project_id_val,
    max_revision_number,
    revision_notes_text,
    false,
    true  -- New revision becomes current version
  ) RETURNING id INTO new_project_id;
  
  -- Archive source project (but keep it, don't delete)
  UPDATE projects
  SET publish_status = 'archived',
      is_current_version = false
  WHERE id = source_project_id;
  
  -- Copy all phases
  FOR phase_record IN
    SELECT * FROM project_phases
    WHERE project_id = source_project_id
    ORDER BY display_order
  LOOP
    INSERT INTO project_phases (
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
    
    -- Copy all operations for this phase (using normalized phase_id)
    FOR operation_record IN
      SELECT * FROM template_operations
      WHERE project_id = source_project_id
        AND phase_id = phase_record.id
      ORDER BY display_order
    LOOP
      -- NORMALIZED: Operations now use phase_id only (no standard_phase_id in operations)
      INSERT INTO template_operations (
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
        operation_record.is_standard_phase,  -- Copy the flag
        operation_record.source_operation_id,  -- Preserve reference links
        operation_record.is_reference
      ) RETURNING id INTO new_operation_id;
      
      -- Copy all steps for this operation
      FOR step_record IN
        SELECT * FROM template_steps
        WHERE operation_id = operation_record.id
        ORDER BY display_order, step_number
      LOOP
        INSERT INTO template_steps (
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
  
  -- Rebuild phases JSON for new revision
  UPDATE projects
  SET phases = rebuild_phases_json_from_project_phases(new_project_id)
  WHERE id = new_project_id;
  
  RAISE NOTICE 'Successfully created revision % (id: %)', max_revision_number, new_project_id;
  
  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

