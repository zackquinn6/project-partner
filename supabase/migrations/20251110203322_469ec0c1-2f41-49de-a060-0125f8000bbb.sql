
-- Fix: Copy standard operations from Standard Project Foundation to projects that are missing them
-- This ensures all standard phases have their operations and steps

-- Function to copy standard operations to a project
CREATE OR REPLACE FUNCTION copy_standard_operations_to_project(target_project_id UUID)
RETURNS void AS $$
DECLARE
  standard_project_id UUID := '00000000-0000-0000-0000-000000000001';
  standard_operation RECORD;
  new_operation_id UUID;
  target_phase_id UUID;
BEGIN
  -- Loop through all standard operations
  FOR standard_operation IN
    SELECT * FROM template_operations
    WHERE project_id = standard_project_id
    ORDER BY display_order
  LOOP
    -- Find the corresponding phase_id in the target project's project_phases
    SELECT id INTO target_phase_id
    FROM project_phases
    WHERE project_id = target_project_id
      AND is_standard = true
      AND standard_phase_id = standard_operation.standard_phase_id
    LIMIT 1;
    
    -- Skip if no matching phase found
    IF target_phase_id IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Check if operation already exists
    IF EXISTS (
      SELECT 1 FROM template_operations
      WHERE project_id = target_project_id
        AND name = standard_operation.name
        AND standard_phase_id = standard_operation.standard_phase_id
    ) THEN
      CONTINUE;
    END IF;
    
    -- Copy the operation
    INSERT INTO template_operations (
      project_id,
      standard_phase_id,
      phase_id,
      name,
      description,
      display_order,
      flow_type
    ) VALUES (
      target_project_id,
      standard_operation.standard_phase_id,
      target_phase_id,
      standard_operation.name,
      standard_operation.description,
      standard_operation.display_order,
      standard_operation.flow_type
    ) RETURNING id INTO new_operation_id;
    
    -- Copy all steps for this operation
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
      flow_type
    )
    SELECT
      new_operation_id,
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
      flow_type
    FROM template_steps
    WHERE operation_id = standard_operation.id
    ORDER BY display_order;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Apply to all projects that have project_phases but no template_operations
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN
    SELECT DISTINCT pp.project_id
    FROM project_phases pp
    WHERE NOT EXISTS (
      SELECT 1 FROM template_operations to2
      WHERE to2.project_id = pp.project_id
    )
  LOOP
    RAISE NOTICE 'Copying standard operations to project: %', project_record.project_id;
    PERFORM copy_standard_operations_to_project(project_record.project_id);
  END LOOP;
END $$;

-- Rebuild phases JSON for all affected projects
UPDATE projects p
SET phases = rebuild_phases_json_from_project_phases(p.id),
    updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM project_phases pp
  WHERE pp.project_id = p.id
)
AND (
  phases IS NULL
  OR jsonb_array_length(phases) = 0
  OR jsonb_array_length((phases::jsonb->0->'operations')::jsonb) = 0
);

-- Update project runs to get the correct phases from their templates
UPDATE project_runs pr
SET phases = (SELECT phases FROM projects WHERE id = pr.template_id),
    updated_at = now()
WHERE phases IS NOT NULL
AND (
  jsonb_array_length((pr.phases::jsonb->0->'operations')::jsonb) = 0
  OR NOT (pr.phases::jsonb->0 ? 'operations')
);
