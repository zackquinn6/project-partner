-- Fix create_project_revision_v2 to ensure unique project names
-- When creating a draft revision, append " (Draft)" to the name and ensure uniqueness

CREATE OR REPLACE FUNCTION public.create_project_revision_v2(
  source_project_id UUID,
  revision_notes_text TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_project RECORD;
  new_project_id UUID;
  base_name TEXT;
  unique_name TEXT;
  name_counter INTEGER := 1;
  existing_count INTEGER;
BEGIN
  -- Get source project details
  SELECT * INTO source_project
  FROM projects
  WHERE id = source_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found: %', source_project_id;
  END IF;
  
  -- Start with base name + " (Draft)"
  base_name := source_project.name || ' (Draft)';
  unique_name := base_name;
  
  -- Check if name already exists and find a unique one
  LOOP
    SELECT COUNT(*) INTO existing_count
    FROM projects
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(unique_name));
    
    EXIT WHEN existing_count = 0;
    
    -- If name exists, append a number
    name_counter := name_counter + 1;
    unique_name := base_name || ' ' || name_counter::TEXT;
  END LOOP;
  
  -- Create new project with unique name
  INSERT INTO projects (
    name,
    description,
    phases,
    category,
    publish_status,
    is_current_version,
    revision_number,
    parent_project_id,
    revision_notes,
    skill_level,
    estimated_total_time,
    typical_size,
    project_type,
    item_type,
    created_at,
    updated_at
  )
  VALUES (
    unique_name,
    source_project.description,
    source_project.phases,
    source_project.category,
    'draft',
    false,
    COALESCE((SELECT MAX(revision_number) FROM projects WHERE parent_project_id = source_project_id), 0) + 1,
    source_project_id,
    revision_notes_text,
    source_project.skill_level,
    source_project.estimated_total_time,
    source_project.typical_size,
    source_project.project_type,
    source_project.item_type,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_project_id;
  
  -- Copy project_phases from source project
  INSERT INTO project_phases (
    project_id,
    name,
    description,
    display_order,
    is_standard,
    phase_order_number
  )
  SELECT
    new_project_id,
    name,
    description,
    display_order,
    is_standard,
    phase_order_number
  FROM project_phases
  WHERE project_id = source_project_id;
  
  -- Copy template_operations from source project
  -- Create a mapping of old phase_id to new phase_id
  CREATE TEMP TABLE phase_id_mapping AS
  SELECT 
    sp.id AS old_phase_id,
    np.id AS new_phase_id
  FROM project_phases sp
  INNER JOIN project_phases np ON sp.name = np.name 
    AND sp.display_order = np.display_order
  WHERE sp.project_id = source_project_id
    AND np.project_id = new_project_id;
  
  INSERT INTO template_operations (
    project_id,
    phase_id,
    name,
    description,
    display_order,
    flow_type,
    user_prompt,
    alternate_group,
    is_standard_phase,
    custom_phase_name,
    custom_phase_description,
    custom_phase_display_order
  )
  SELECT
    new_project_id,
    pm.new_phase_id,
    op.name,
    op.description,
    op.display_order,
    op.flow_type,
    op.user_prompt,
    op.alternate_group,
    op.is_standard_phase,
    op.custom_phase_name,
    op.custom_phase_description,
    op.custom_phase_display_order
  FROM template_operations op
  INNER JOIN phase_id_mapping pm ON op.phase_id = pm.old_phase_id
  WHERE EXISTS (
    SELECT 1 FROM project_phases sp 
    WHERE sp.id = op.phase_id 
    AND sp.project_id = source_project_id
  );
  
  -- Create a mapping of old operation_id to new operation_id
  CREATE TEMP TABLE operation_id_mapping AS
  SELECT 
    so.id AS old_operation_id,
    no.id AS new_operation_id
  FROM template_operations so
  INNER JOIN template_operations no ON so.name = no.name
    AND so.display_order = no.display_order
  INNER JOIN phase_id_mapping pm ON so.phase_id = pm.old_phase_id
    AND no.phase_id = pm.new_phase_id
  WHERE EXISTS (
    SELECT 1 FROM project_phases sp 
    WHERE sp.id = so.phase_id 
    AND sp.project_id = source_project_id
  );
  
  -- Copy template_steps from source project
  INSERT INTO template_steps (
    operation_id,
    step_number,
    step_title,
    description,
    display_order,
    skill_level,
    step_type,
    estimated_time_minutes,
    workers_needed
  )
  SELECT
    om.new_operation_id,
    ts.step_number,
    ts.step_title,
    ts.description,
    ts.display_order,
    ts.skill_level,
    ts.step_type,
    ts.estimated_time_minutes,
    ts.workers_needed
  FROM template_steps ts
  INNER JOIN operation_id_mapping om ON ts.operation_id = om.old_operation_id;
  
  -- Clean up temp tables
  DROP TABLE IF EXISTS operation_id_mapping;
  DROP TABLE IF EXISTS phase_id_mapping;
  
  -- Rebuild phases JSON from relational data
  PERFORM rebuild_phases_json_from_project_phases(new_project_id);
  
  RETURN new_project_id;
END;
$$;

