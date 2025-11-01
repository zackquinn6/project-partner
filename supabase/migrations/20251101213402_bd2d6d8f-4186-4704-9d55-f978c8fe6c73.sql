-- Fix status/publish_status in revision and project creation functions

-- Update create_project_revision_v2 to use correct status values
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
  
  -- Create new project (revision) with correct status values
  INSERT INTO projects (
    name,
    description,
    category,
    status,
    publish_status,
    created_by,
    parent_project_id,
    revision_number,
    revision_notes,
    is_standard_template
  ) VALUES (
    source_project.name,
    source_project.description,
    source_project.category,
    'not-started',
    'draft',
    auth.uid(),
    COALESCE(source_project.parent_project_id, source_project_id),
    COALESCE(source_project.revision_number, 0) + 1,
    revision_notes_text,
    false
  ) RETURNING id INTO new_project_id;
  
  -- Archive source project
  UPDATE projects
  SET publish_status = 'archived'
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
    
    -- Copy all operations for this phase
    FOR operation_record IN
      SELECT * FROM template_operations
      WHERE project_id = source_project_id
        AND phase_id = phase_record.id
      ORDER BY display_order
    LOOP
      INSERT INTO template_operations (
        project_id,
        phase_id,
        name,
        description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        dependent_on
      ) VALUES (
        new_project_id,
        new_phase_id,
        operation_record.name,
        operation_record.description,
        operation_record.flow_type,
        operation_record.user_prompt,
        operation_record.alternate_group,
        operation_record.display_order,
        operation_record.dependent_on
      ) RETURNING id INTO new_operation_id;
      
      -- Copy all steps for this operation
      FOR step_record IN
        SELECT * FROM template_steps
        WHERE operation_id = operation_record.id
        ORDER BY step_number
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
  
  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update create_project_with_standard_foundation_v2 to use correct status values
CREATE OR REPLACE FUNCTION create_project_with_standard_foundation_v2(
  project_name TEXT,
  project_description TEXT,
  project_category TEXT[]
)
RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  standard_phase RECORD;
  new_phase_id UUID;
  standard_operation RECORD;
  new_operation_id UUID;
  standard_step RECORD;
BEGIN
  -- Create new project with correct status values
  INSERT INTO projects (
    name,
    description,
    category,
    status,
    publish_status,
    created_by,
    is_standard_template
  ) VALUES (
    project_name,
    project_description,
    project_category,
    'not-started',
    'draft',
    auth.uid(),
    false
  ) RETURNING id INTO new_project_id;
  
  -- Copy standard phases structure
  FOR standard_phase IN
    SELECT * FROM project_phases
    WHERE project_id = '00000000-0000-0000-0000-000000000001'
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
      standard_phase.name,
      standard_phase.description,
      standard_phase.display_order,
      true,
      standard_phase.id
    ) RETURNING id INTO new_phase_id;
    
    -- Copy operations
    FOR standard_operation IN
      SELECT * FROM template_operations
      WHERE project_id = '00000000-0000-0000-0000-000000000001'
        AND phase_id = standard_phase.id
      ORDER BY display_order
    LOOP
      INSERT INTO template_operations (
        project_id,
        phase_id,
        standard_phase_id,
        name,
        description,
        flow_type,
        user_prompt,
        display_order
      ) VALUES (
        new_project_id,
        new_phase_id,
        standard_phase.id,
        standard_operation.name,
        standard_operation.description,
        standard_operation.flow_type,
        standard_operation.user_prompt,
        standard_operation.display_order
      ) RETURNING id INTO new_operation_id;
      
      -- Copy steps
      FOR standard_step IN
        SELECT * FROM template_steps
        WHERE operation_id = standard_operation.id
        ORDER BY step_number
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
          standard_step.step_number,
          standard_step.step_title,
          standard_step.description,
          standard_step.flow_type,
          standard_step.step_type,
          standard_step.content_sections,
          standard_step.materials,
          standard_step.tools,
          standard_step.outputs,
          standard_step.apps,
          standard_step.estimated_time_minutes,
          standard_step.display_order
        );
      END LOOP;
    END LOOP;
  END LOOP;
  
  -- Build initial phases JSON
  UPDATE projects
  SET phases = rebuild_phases_json_from_project_phases(new_project_id)
  WHERE id = new_project_id;
  
  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;