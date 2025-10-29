-- Delete all Service Terms operations from all projects
-- These are linked to the Kickoff standard phase and should no longer exist
DELETE FROM public.template_operations
WHERE name = 'Service Terms'
  AND standard_phase_id = 'fb93eeff-45b0-43a1-92a4-ccc517368e20';

-- Rebuild phases JSON for all affected projects
-- This ensures the deletion cascades to the phases JSON
UPDATE public.projects
SET phases = rebuild_phases_json_from_templates(id),
    updated_at = now()
WHERE id IN (
  SELECT DISTINCT p.id 
  FROM public.projects p
  WHERE p.publish_status != 'archived'
);

-- Add trigger to cascade standard phase changes automatically
-- This trigger will detect when operations are deleted from the Standard Project
-- and automatically delete matching operations from all other projects
CREATE OR REPLACE FUNCTION cascade_standard_phase_deletions()
RETURNS TRIGGER AS $$
BEGIN
  -- If an operation is deleted from the Standard Project
  IF OLD.project_id = '00000000-0000-0000-0000-000000000001' THEN
    -- Delete matching operations from all other projects with the same standard_phase_id
    DELETE FROM template_operations
    WHERE name = OLD.name
      AND standard_phase_id = OLD.standard_phase_id
      AND project_id != '00000000-0000-0000-0000-000000000001';
    
    -- Rebuild phases JSON for all affected projects
    UPDATE projects
    SET phases = rebuild_phases_json_from_templates(id),
        updated_at = now()
    WHERE publish_status != 'archived'
      AND id != '00000000-0000-0000-0000-000000000001';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for operation deletions
DROP TRIGGER IF EXISTS cascade_standard_deletions_trigger ON template_operations;
CREATE TRIGGER cascade_standard_deletions_trigger
  AFTER DELETE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_standard_phase_deletions();

-- Add trigger to cascade standard phase inserts/updates
CREATE OR REPLACE FUNCTION cascade_standard_phase_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- If an operation is inserted/updated in the Standard Project
  IF NEW.project_id = '00000000-0000-0000-0000-000000000001' THEN
    -- Update matching operations in all other projects
    UPDATE template_operations
    SET description = NEW.description,
        user_prompt = NEW.user_prompt,
        flow_type = NEW.flow_type,
        updated_at = now()
    WHERE name = NEW.name
      AND standard_phase_id = NEW.standard_phase_id
      AND project_id != '00000000-0000-0000-0000-000000000001';
    
    -- Rebuild phases JSON for affected projects
    UPDATE projects
    SET phases = rebuild_phases_json_from_templates(id),
        updated_at = now()
    WHERE publish_status != 'archived'
      AND id != '00000000-0000-0000-0000-000000000001';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for operation inserts/updates
DROP TRIGGER IF EXISTS cascade_standard_changes_trigger ON template_operations;
CREATE TRIGGER cascade_standard_changes_trigger
  AFTER INSERT OR UPDATE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_standard_phase_changes();