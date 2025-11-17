-- Fix cascade_standard_phase_changes trigger to remove standard_phase_id reference from template_operations
-- This trigger fires on INSERT/UPDATE to template_operations and was trying to access NEW.standard_phase_id

DROP TRIGGER IF EXISTS cascade_standard_changes_trigger ON template_operations;
DROP TRIGGER IF EXISTS cascade_standard_deletions_trigger ON template_operations;

CREATE OR REPLACE FUNCTION public.cascade_standard_phase_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_standard_phase_id uuid;
BEGIN
  -- If an operation is inserted/updated in the Standard Project
  IF NEW.project_id = '00000000-0000-0000-0000-000000000001' THEN
    -- Get standard_phase_id from project_phases via phase_id
    SELECT pp.standard_phase_id
    INTO affected_standard_phase_id
    FROM project_phases pp
    WHERE pp.id = NEW.phase_id;
    
    -- Update matching operations in project TEMPLATES only (not project_runs)
    -- Match by name and phase_id (via project_phases.standard_phase_id)
    UPDATE template_operations toper
    SET description = NEW.description,
        user_prompt = NEW.user_prompt,
        flow_type = NEW.flow_type,
        updated_at = now()
    FROM project_phases pp
    WHERE toper.name = NEW.name
      AND toper.phase_id = pp.id
      AND pp.standard_phase_id = affected_standard_phase_id
      AND toper.project_id != '00000000-0000-0000-0000-000000000001'
      AND toper.project_id IN (SELECT id FROM projects WHERE is_standard_template = false);
    
    -- Rebuild phases JSON ONLY for project templates (not project_runs)
    UPDATE projects
    SET phases = rebuild_phases_json_from_templates(id),
        updated_at = now()
    WHERE publish_status != 'archived'
      AND is_standard_template = false
      AND id != '00000000-0000-0000-0000-000000000001';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cascade_standard_phase_deletions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_standard_phase_id uuid;
BEGIN
  -- If an operation is deleted from the Standard Project
  IF OLD.project_id = '00000000-0000-0000-0000-000000000001' THEN
    -- Get standard_phase_id from project_phases via phase_id
    SELECT pp.standard_phase_id
    INTO affected_standard_phase_id
    FROM project_phases pp
    WHERE pp.id = OLD.phase_id;
    
    -- Delete matching operations from project TEMPLATES only (not project_runs)
    -- Match by name and phase_id (via project_phases.standard_phase_id)
    DELETE FROM template_operations toper
    USING project_phases pp
    WHERE toper.name = OLD.name
      AND toper.phase_id = pp.id
      AND pp.standard_phase_id = affected_standard_phase_id
      AND toper.project_id != '00000000-0000-0000-0000-000000000001'
      AND toper.project_id IN (SELECT id FROM projects WHERE is_standard_template = false);
    
    -- Rebuild phases JSON ONLY for project templates (not project_runs)
    UPDATE projects
    SET phases = rebuild_phases_json_from_templates(id),
        updated_at = now()
    WHERE publish_status != 'archived'
      AND is_standard_template = false
      AND id != '00000000-0000-0000-0000-000000000001';
  END IF;
  
  RETURN OLD;
END;
$$;

-- Recreate triggers if they don't exist
CREATE TRIGGER cascade_standard_changes_trigger
  AFTER INSERT OR UPDATE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_standard_phase_changes();

CREATE TRIGGER cascade_standard_deletions_trigger
  AFTER DELETE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_standard_phase_deletions();

