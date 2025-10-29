-- Fix the ambiguous column reference in cascade_standard_phase_updates trigger
CREATE OR REPLACE FUNCTION public.cascade_standard_phase_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected_operation_id uuid;
  standard_project_id uuid := '00000000-0000-0000-0000-000000000001';
  project_template record;
  rebuilt_phases jsonb;
  affected_standard_phase_id uuid;  -- Renamed to avoid ambiguity
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
      affected_standard_phase_id := OLD.standard_phase_id;
    ELSE
      IF NEW.project_id != '00000000-0000-0000-0000-000000000001' THEN
        RETURN NEW;
      END IF;
      affected_standard_phase_id := NEW.standard_phase_id;
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
      AND (affected_standard_phase_id IS NULL OR tmo.standard_phase_id = affected_standard_phase_id)
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
$function$;

-- Now add correct apps to Standard Project Foundation Kickoff steps
-- Step 2: Complete DIY Assessment should have My Profile app
UPDATE template_steps
SET apps = '[
  {
    "id": "app-my-profile",
    "appName": "My Profile",
    "appType": "native",
    "icon": "User",
    "description": "View and edit your profile",
    "actionKey": "my-profile",
    "displayOrder": 1
  }
]'::jsonb,
updated_at = now()
WHERE id = '096823bc-238c-44da-ad5a-fade8382dec6';

-- Step 3: Set Project Parameters should have Project Customizer app
UPDATE template_steps
SET apps = '[
  {
    "id": "app-project-customizer",
    "appName": "Scope Builder",
    "appType": "native",
    "icon": "Settings",
    "description": "Decide what work will actually be done in each space",
    "actionKey": "project-customizer",
    "displayOrder": 1
  }
]'::jsonb,
updated_at = now()
WHERE id = '0b367f4a-9dfb-47fd-a055-7343dcd7347e';