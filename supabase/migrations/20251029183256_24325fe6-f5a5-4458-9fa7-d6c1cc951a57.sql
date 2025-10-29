-- Fix standard phase content propagation - ensure Standard Project itself gets rebuilt

-- Update the cascade function to ALSO rebuild the Standard Project's own phases JSON
CREATE OR REPLACE FUNCTION public.cascade_standard_phase_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If an operation is inserted/updated in the Standard Project
  IF NEW.project_id = '00000000-0000-0000-0000-000000000001' THEN
    -- First, rebuild the Standard Project's OWN phases JSON from its template tables
    UPDATE projects
    SET phases = rebuild_phases_json_from_templates(id),
        updated_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000001';
    
    -- Then, update matching operations in other project TEMPLATES
    UPDATE template_operations
    SET description = NEW.description,
        user_prompt = NEW.user_prompt,
        flow_type = NEW.flow_type,
        updated_at = now()
    WHERE name = NEW.name
      AND standard_phase_id = NEW.standard_phase_id
      AND project_id != '00000000-0000-0000-0000-000000000001'
      AND project_id IN (SELECT id FROM projects WHERE is_standard_template = false);
    
    -- Finally, rebuild phases JSON for all other project templates
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

-- Update the deletion cascade to also rebuild Standard Project
CREATE OR REPLACE FUNCTION public.cascade_standard_phase_deletions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If an operation is deleted from the Standard Project
  IF OLD.project_id = '00000000-0000-0000-0000-000000000001' THEN
    -- First, rebuild the Standard Project's OWN phases JSON
    UPDATE projects
    SET phases = rebuild_phases_json_from_templates(id),
        updated_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000001';
    
    -- Then, delete matching operations from other project TEMPLATES
    DELETE FROM template_operations
    WHERE name = OLD.name
      AND standard_phase_id = OLD.standard_phase_id
      AND project_id != '00000000-0000-0000-0000-000000000001'
      AND project_id IN (SELECT id FROM projects WHERE is_standard_template = false);
    
    -- Finally, rebuild phases JSON for all other project templates
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

-- Also create trigger for template_steps to ensure step-level changes rebuild phases
CREATE OR REPLACE FUNCTION public.rebuild_standard_project_phases_on_step_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_project_id uuid;
BEGIN
  -- Get the project_id from the operation
  IF TG_OP = 'DELETE' THEN
    SELECT project_id INTO affected_project_id
    FROM template_operations
    WHERE id = OLD.operation_id;
  ELSE
    SELECT project_id INTO affected_project_id
    FROM template_operations
    WHERE id = NEW.operation_id;
  END IF;
  
  -- If this is a Standard Project step, rebuild its phases JSON
  IF affected_project_id = '00000000-0000-0000-0000-000000000001' THEN
    UPDATE projects
    SET phases = rebuild_phases_json_from_templates(id),
        updated_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000001';
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Add trigger for template_steps changes
DROP TRIGGER IF EXISTS rebuild_standard_on_step_change ON template_steps;
CREATE TRIGGER rebuild_standard_on_step_change
  AFTER INSERT OR UPDATE OR DELETE ON template_steps
  FOR EACH ROW
  EXECUTE FUNCTION rebuild_standard_project_phases_on_step_change();

COMMENT ON FUNCTION rebuild_standard_project_phases_on_step_change() IS
'Rebuilds Standard Project phases JSON when template_steps are modified, ensuring content stays in sync.';