-- Fix standard phase cascading by ensuring rebuild happens on Standard Project changes
-- This replaces the previous cascade function with a more robust version

DROP TRIGGER IF EXISTS cascade_standard_updates_on_steps ON template_steps;
DROP TRIGGER IF EXISTS cascade_standard_updates_on_operations ON template_operations;
DROP FUNCTION IF EXISTS cascade_standard_template_updates();

-- Enhanced function that properly cascades Standard Project changes
CREATE OR REPLACE FUNCTION cascade_standard_phase_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_operation_id uuid;
  standard_project_id uuid := '00000000-0000-0000-0000-000000000001';
  project_template record;
  rebuilt_phases jsonb;
  standard_phase_id uuid;
BEGIN
  -- Only run if this is the Standard Project
  IF TG_TABLE_NAME = 'template_steps' THEN
    -- Get the operation_id and check if it belongs to Standard Project
    IF TG_OP = 'DELETE' THEN
      affected_operation_id := OLD.operation_id;
    ELSE
      affected_operation_id := NEW.operation_id;
    END IF;
    
    SELECT project_id INTO STRICT standard_project_id
    FROM template_operations 
    WHERE id = affected_operation_id;
    
    -- If not Standard Project, return early
    IF standard_project_id != '00000000-0000-0000-0000-000000000001' THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'template_operations' THEN
    -- Check if this is a standard project operation
    IF TG_OP = 'DELETE' THEN
      IF OLD.project_id != '00000000-0000-0000-0000-000000000001' THEN
        RETURN OLD;
      END IF;
      standard_phase_id := OLD.standard_phase_id;
    ELSE
      IF NEW.project_id != '00000000-0000-0000-0000-000000000001' THEN
        RETURN NEW;
      END IF;
      standard_phase_id := NEW.standard_phase_id;
    END IF;
  END IF;
  
  -- First, rebuild the Standard Project's own phases JSON
  rebuilt_phases := rebuild_phases_json_from_templates('00000000-0000-0000-0000-000000000001');
  UPDATE projects
  SET phases = rebuilt_phases,
      updated_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  -- Then update all project templates that use this standard phase
  FOR project_template IN
    SELECT DISTINCT p.id 
    FROM projects p
    INNER JOIN template_operations tmo ON tmo.project_id = p.id
    WHERE p.is_standard_template = false 
      AND p.parent_project_id IS NULL
      AND p.id != '00000000-0000-0000-0000-000000000001'
      AND (standard_phase_id IS NULL OR tmo.standard_phase_id = standard_phase_id)
  LOOP
    -- Rebuild phases JSON for each affected template
    rebuilt_phases := rebuild_phases_json_from_templates(project_template.id);
    
    -- Update the template with rebuilt phases
    UPDATE projects
    SET phases = rebuilt_phases,
        updated_at = now()
    WHERE id = project_template.id;
  END LOOP;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for both tables
CREATE TRIGGER cascade_standard_phase_updates_on_steps
AFTER INSERT OR UPDATE OR DELETE ON template_steps
FOR EACH ROW
EXECUTE FUNCTION cascade_standard_phase_updates();

CREATE TRIGGER cascade_standard_phase_updates_on_operations
AFTER INSERT OR UPDATE OR DELETE ON template_operations
FOR EACH ROW
EXECUTE FUNCTION cascade_standard_phase_updates();

-- Log this fix
SELECT log_comprehensive_security_event(
  'standard_phase_cascade_fixed',
  'medium',
  'Fixed standard phase cascading to properly update all project templates',
  auth.uid(),
  NULL, NULL, NULL,
  jsonb_build_object(
    'action', 'fix_cascade_triggers',
    'scope', 'standard_project_and_all_templates',
    'includes_apps', true
  )
);