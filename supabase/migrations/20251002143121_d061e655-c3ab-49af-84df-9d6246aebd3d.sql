
-- Delete broken revision 1 and recreate it properly with all normalized data
DO $$
DECLARE
  broken_revision_id UUID;
  source_revision_id UUID;
  new_revision_id UUID;
  old_operation_id UUID;
  new_operation_id UUID;
BEGIN
  -- Get the broken revision 1
  SELECT id INTO broken_revision_id
  FROM projects
  WHERE name = 'Tile Flooring Installation'
    AND revision_number = 1;
  
  -- Get source revision 0
  SELECT id INTO source_revision_id
  FROM projects
  WHERE name = 'Tile Flooring Installation'
    AND revision_number = 0;
  
  IF broken_revision_id IS NOT NULL THEN
    RAISE NOTICE 'Deleting broken revision 1: %', broken_revision_id;
    
    -- Delete in correct order due to foreign keys
    DELETE FROM template_steps ts
    USING template_operations to2
    WHERE ts.operation_id = to2.id
      AND to2.project_id = broken_revision_id;
    
    DELETE FROM template_operations
    WHERE project_id = broken_revision_id;
    
    DELETE FROM projects
    WHERE id = broken_revision_id;
    
    RAISE NOTICE 'Broken revision deleted';
  END IF;
  
  -- Create new revision 1 with complete data
  IF source_revision_id IS NOT NULL THEN
    RAISE NOTICE 'Creating new revision from source: %', source_revision_id;
    
    -- Create the new project revision
    INSERT INTO projects (
      name, description, image, status, publish_status, category,
      difficulty, effort_level, estimated_time, scaling_unit, phases,
      estimated_time_per_unit, parent_project_id, revision_number,
      revision_notes, is_current_version
    )
    SELECT 
      name, description, image, 'not-started', 'draft', category,
      difficulty, effort_level, estimated_time, scaling_unit, phases,
      estimated_time_per_unit, 
      COALESCE(parent_project_id, id) as parent_project_id,
      1 as revision_number,
      'Fixed revision with complete normalized data and content migration' as revision_notes,
      false as is_current_version
    FROM projects
    WHERE id = source_revision_id
    RETURNING id INTO new_revision_id;
    
    RAISE NOTICE 'New revision created: %', new_revision_id;
    
    -- Copy all template_operations
    FOR old_operation_id IN 
      SELECT id FROM template_operations 
      WHERE project_id = source_revision_id 
      ORDER BY display_order
    LOOP
      INSERT INTO template_operations (
        project_id, standard_phase_id, name, description, display_order
      )
      SELECT 
        new_revision_id, standard_phase_id, name, description, display_order
      FROM template_operations
      WHERE id = old_operation_id
      RETURNING id INTO new_operation_id;
      
      -- Copy all template_steps for this operation
      INSERT INTO template_steps (
        operation_id, step_number, step_title, description,
        content_sections, materials, tools, outputs,
        estimated_time_minutes, display_order
      )
      SELECT 
        new_operation_id, step_number, step_title, description,
        content_sections, materials, tools, outputs,
        estimated_time_minutes, display_order
      FROM template_steps
      WHERE operation_id = old_operation_id
      ORDER BY display_order;
    END LOOP;
    
    RAISE NOTICE 'Revision created with all operations and steps';
  END IF;
END $$;
