
-- Create function to rebuild existing projects from the Standard Project Foundation
-- This allows updating projects that were created before apps were synced

CREATE OR REPLACE FUNCTION public.rebuild_project_from_standard(project_id_to_rebuild uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  standard_project_id uuid := '00000000-0000-0000-0000-000000000001';
  standard_operation record;
  new_operation_id uuid;
  rebuilt_phases jsonb;
BEGIN
  -- Verify project exists and is not the standard template itself
  IF project_id_to_rebuild = standard_project_id THEN
    RAISE EXCEPTION 'Cannot rebuild the Standard Project Foundation itself';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = project_id_to_rebuild) THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  
  -- Delete old template data for this project
  DELETE FROM template_steps 
  WHERE operation_id IN (
    SELECT id FROM template_operations WHERE project_id = project_id_to_rebuild
  );
  
  DELETE FROM template_operations WHERE project_id = project_id_to_rebuild;
  
  -- Re-copy all operations and steps from Standard Project Foundation
  FOR standard_operation IN
    SELECT * FROM template_operations
    WHERE project_id = standard_project_id
    ORDER BY display_order
  LOOP
    -- Copy operation
    INSERT INTO template_operations (
      project_id,
      standard_phase_id,
      name,
      description,
      display_order
    ) VALUES (
      project_id_to_rebuild,
      standard_operation.standard_phase_id,
      standard_operation.name,
      standard_operation.description,
      standard_operation.display_order
    ) RETURNING id INTO new_operation_id;
    
    -- Copy all steps for this operation (INCLUDING apps)
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
      display_order
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
      display_order
    FROM template_steps
    WHERE operation_id = standard_operation.id
    ORDER BY display_order;
  END LOOP;
  
  -- Rebuild phases JSON from the newly copied template data
  rebuilt_phases := rebuild_phases_json_from_templates(project_id_to_rebuild);
  
  -- Mark standard phases with isStandard: true
  rebuilt_phases := (
    SELECT jsonb_agg(
      CASE 
        WHEN phase->>'name' IN ('Kickoff', 'Planning', 'Ordering', 'Close Project')
        THEN jsonb_set(phase, '{isStandard}', 'true'::jsonb)
        ELSE phase
      END
    )
    FROM jsonb_array_elements(rebuilt_phases) AS phase
  );
  
  -- Update project with rebuilt phases
  UPDATE projects
  SET phases = rebuilt_phases,
      updated_at = now()
  WHERE id = project_id_to_rebuild;
  
  RAISE NOTICE 'Successfully rebuilt project % from Standard Project Foundation', project_id_to_rebuild;
END;
$function$;

-- Test: Rebuild the Interior Painting project
SELECT rebuild_project_from_standard('65547380-4135-4e99-855d-af78172aaf3a'::uuid);

-- Verify apps are now in the project
SELECT 
  ts.step_title,
  jsonb_array_length(COALESCE(ts.apps, '[]'::jsonb)) as apps_count
FROM template_steps ts
JOIN template_operations top ON top.id = ts.operation_id
JOIN standard_phases sp ON sp.id = top.standard_phase_id
WHERE top.project_id = '65547380-4135-4e99-855d-af78172aaf3a'
  AND sp.name = 'Planning'
  AND ts.step_title = 'Initial Project Plan';
