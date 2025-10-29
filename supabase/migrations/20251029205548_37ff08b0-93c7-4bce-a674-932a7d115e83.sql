-- Manually trigger the cascade since automatic didn't work
-- This calls the edge function sync approach as a workaround
SELECT 
  'Manual cascade needed - automatic trigger did not propagate apps to templates' as status;

-- For now, let's manually update all template steps to match Standard Project
-- Update DIY Assessment step in all templates
UPDATE template_steps ts
SET apps = (
  SELECT apps 
  FROM template_steps 
  WHERE id = '096823bc-238c-44da-ad5a-fade8382dec6'
),
updated_at = now()
WHERE ts.step_title = 'Complete DIY Assessment'
  AND ts.operation_id IN (
    SELECT tope.id 
    FROM template_operations tope
    JOIN standard_phases sp ON sp.id = tope.standard_phase_id
    JOIN projects p ON p.id = tope.project_id
    WHERE sp.name = 'Kickoff'
      AND tope.name = 'DIY Profile'
      AND p.is_standard_template = false
  );

-- Update Project Parameters step in all templates
UPDATE template_steps ts
SET apps = (
  SELECT apps 
  FROM template_steps 
  WHERE id = '0b367f4a-9dfb-47fd-a055-7343dcd7347e'
),
updated_at = now()
WHERE ts.step_title = 'Set Project Parameters'
  AND ts.operation_id IN (
    SELECT tope.id 
    FROM template_operations tope
    JOIN standard_phases sp ON sp.id = tope.standard_phase_id
    JOIN projects p ON p.id = tope.project_id
    WHERE sp.name = 'Kickoff'
      AND tope.name = 'Project Profile'
      AND p.is_standard_template = false
  );

-- Rebuild phases JSON for all affected templates
DO $$
DECLARE
  template_record RECORD;
BEGIN
  FOR template_record IN
    SELECT DISTINCT p.id
    FROM projects p
    WHERE p.is_standard_template = false
      AND p.parent_project_id IS NULL
      AND p.id != '00000000-0000-0000-0000-000000000001'
  LOOP
    PERFORM rebuild_phases_json_from_templates(template_record.id);
    
    UPDATE projects
    SET updated_at = now()
    WHERE id = template_record.id;
  END LOOP;
END $$;