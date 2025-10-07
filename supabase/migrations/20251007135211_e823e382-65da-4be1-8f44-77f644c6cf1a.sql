
-- Fix Tile Flooring Installation operations to be assigned to correct standard phases

-- First, let's get the project ID and standard phase IDs
DO $$
DECLARE
  v_project_id uuid;
  v_kickoff_phase_id uuid;
  v_planning_phase_id uuid;
  v_prep_phase_id uuid;
  v_install_phase_id uuid;
  v_close_phase_id uuid;
BEGIN
  -- Get project ID
  SELECT id INTO v_project_id 
  FROM projects 
  WHERE name = 'Tile Flooring Installation' AND revision_number = 0;
  
  -- Get standard phase IDs
  SELECT id INTO v_kickoff_phase_id FROM standard_phases WHERE name = 'Kickoff';
  SELECT id INTO v_planning_phase_id FROM standard_phases WHERE name = 'Planning';
  SELECT id INTO v_prep_phase_id FROM standard_phases WHERE name = 'Prep';
  SELECT id INTO v_install_phase_id FROM standard_phases WHERE name = 'Install';
  SELECT id INTO v_close_phase_id FROM standard_phases WHERE name = 'Close Project';
  
  -- Update operations to correct phases based on their names
  -- Prep phase operations
  UPDATE template_operations 
  SET standard_phase_id = v_prep_phase_id
  WHERE project_id = v_project_id
  AND name IN (
    'Project Setup',
    'Hazardous materials removal',
    'Demo',
    'Demo - wood floor',
    'Subfloor prep',
    'Assess floor',
    'Tile base install',
    'Cleaning'
  );
  
  -- Install phase operations  
  UPDATE template_operations
  SET standard_phase_id = v_install_phase_id
  WHERE project_id = v_project_id
  AND name IN (
    'Layout',
    'Cut',
    'Mix',
    'Set',
    'Install tile trim and baseboard',
    'Pausing mid-project',
    'Thinset curing',
    'Leveling system removal',
    'Grout & caulk',
    'Seal',
    'Install wood trim and baseboard',
    'Install toilet'
  );
  
  -- Close Project phase operations
  UPDATE template_operations
  SET standard_phase_id = v_close_phase_id
  WHERE project_id = v_project_id
  AND name IN (
    'Complete project',
    'Prep for pickup',
    'Materials disposal',
    'Post-install inspection'
  );
  
  -- Note: No operations are currently in Planning or Kickoff for this project
  -- The standard phases will be added when creating project runs
  
  RAISE NOTICE 'Updated template_operations for Tile Flooring Installation';
  
  -- Rebuild the phases JSON for this project
  UPDATE projects
  SET phases = rebuild_phases_json_from_templates(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;
  
  RAISE NOTICE 'Rebuilt phases JSON for Tile Flooring Installation';
  
  -- Also update any revisions
  UPDATE projects p
  SET phases = rebuild_phases_json_from_templates(p.id),
      updated_at = now()
  WHERE p.parent_project_id = v_project_id OR p.id = v_project_id;
  
  RAISE NOTICE 'Updated all revisions';
END $$;
