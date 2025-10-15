-- Refresh all active project runs to apply corrected phase ordering
-- This updates the phases JSON for all project runs from their templates

DO $$
DECLARE
  run_record RECORD;
  template_phases JSONB;
BEGIN
  FOR run_record IN 
    SELECT id, template_id, name
    FROM project_runs
    WHERE progress < 100  -- Only active projects
  LOOP
    -- Get the latest phases from the template (with corrected ordering)
    SELECT phases INTO template_phases
    FROM projects
    WHERE id = run_record.template_id;
    
    IF template_phases IS NOT NULL THEN
      -- Update the project run with fresh phases from template
      UPDATE project_runs
      SET phases = template_phases,
          updated_at = now()
      WHERE id = run_record.id;
      
      RAISE NOTICE 'Updated project run: % (ID: %)', run_record.name, run_record.id;
    END IF;
  END LOOP;
END $$;