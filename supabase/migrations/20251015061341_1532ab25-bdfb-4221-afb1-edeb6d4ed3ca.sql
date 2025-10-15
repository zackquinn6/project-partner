-- Fix standard_phases display_order to enforce correct ordering
-- Kickoff must be first, Planning second, etc.

UPDATE standard_phases
SET display_order = CASE name
  WHEN 'Kickoff' THEN 1
  WHEN 'Planning' THEN 2
  WHEN 'Ordering' THEN 3
  WHEN 'Prep' THEN 4
  WHEN 'Install' THEN 5
  WHEN 'Finish' THEN 6
  WHEN 'Close Project' THEN 7
  ELSE display_order
END
WHERE name IN ('Kickoff', 'Planning', 'Ordering', 'Prep', 'Install', 'Finish', 'Close Project');

-- Rebuild all project phases to reflect correct ordering
DO $$
DECLARE
  proj_record RECORD;
BEGIN
  FOR proj_record IN 
    SELECT DISTINCT project_id 
    FROM template_operations
  LOOP
    UPDATE projects 
    SET phases = rebuild_phases_json_from_templates(proj_record.project_id),
        updated_at = now()
    WHERE id = proj_record.project_id;
  END LOOP;
END $$;