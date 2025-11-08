-- Fix Standard Project phases to link to standard_phases table

-- Update Kickoff phase
UPDATE project_phases
SET 
  standard_phase_id = (SELECT id FROM standard_phases WHERE name = 'Kickoff' AND is_locked = true),
  is_standard = true
WHERE project_id = '00000000-0000-0000-0000-000000000001' 
  AND name = 'Kickoff';

-- Update Planning phase
UPDATE project_phases
SET 
  standard_phase_id = (SELECT id FROM standard_phases WHERE name = 'Planning' AND is_locked = true),
  is_standard = true
WHERE project_id = '00000000-0000-0000-0000-000000000001' 
  AND name = 'Planning';

-- Update Ordering phase
UPDATE project_phases
SET 
  standard_phase_id = (SELECT id FROM standard_phases WHERE name = 'Ordering' AND is_locked = true),
  is_standard = true
WHERE project_id = '00000000-0000-0000-0000-000000000001' 
  AND name = 'Ordering';

-- Update Close Project phase
UPDATE project_phases
SET 
  standard_phase_id = (SELECT id FROM standard_phases WHERE name = 'Close Project' AND is_locked = true),
  is_standard = true
WHERE project_id = '00000000-0000-0000-0000-000000000001' 
  AND name = 'Close Project';

-- Update create_project_with_standard_foundation_v2 to use standard_phase_id correctly
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
  -- Create new project
  INSERT INTO projects (
    name,
    description,
    category,
    publish_status,
    created_by,
    is_standard_template
  ) VALUES (
    project_name,
    project_description,
    project_category,
    'draft',
    auth.uid(),
    false
  ) RETURNING id INTO new_project_id;
  
  -- Copy standard phases structure from Standard Project
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
      standard_phase.is_standard,
      standard_phase.standard_phase_id  -- Use the standard_phase_id from Standard Project, not the phase's own id
    ) RETURNING id INTO new_phase_id;
    
    -- Copy operations for this phase
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
        display_order,
        flow_type,
        user_prompt,
        alternate_group,
        dependent_on
      ) VALUES (
        new_project_id,
        new_phase_id,
        standard_phase.standard_phase_id,  -- Link to standard_phases table
        standard_operation.name,
        standard_operation.description,
        standard_operation.display_order,
        standard_operation.flow_type,
        standard_operation.user_prompt,
        standard_operation.alternate_group,
        NULL  -- Don't copy dependencies across projects
      ) RETURNING id INTO new_operation_id;
      
      -- Copy steps for this operation
      FOR standard_step IN
        SELECT * FROM template_steps
        WHERE operation_id = standard_operation.id
        ORDER BY display_order
      LOOP
        INSERT INTO template_steps (
          operation_id,
          step_number,
          step_title,
          description,
          content_sections,
          materials,
          tools,
          outputs,
          apps,
          estimated_time_minutes,
          display_order,
          flow_type,
          step_type
        ) VALUES (
          new_operation_id,
          standard_step.step_number,
          standard_step.step_title,
          standard_step.description,
          standard_step.content_sections,
          standard_step.materials,
          standard_step.tools,
          standard_step.outputs,
          standard_step.apps,
          standard_step.estimated_time_minutes,
          standard_step.display_order,
          standard_step.flow_type,
          standard_step.step_type
        );
      END LOOP;
    END LOOP;
  END LOOP;
  
  -- Rebuild phases JSON from project_phases
  UPDATE projects
  SET phases = rebuild_phases_json_from_project_phases(new_project_id)
  WHERE id = new_project_id;
  
  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;