
-- Fix revision 1 - update its template_operations to match revision 0
DO $$
DECLARE
  v_rev0_id uuid;
  v_rev1_id uuid;
  v_prep_phase_id uuid;
  v_install_phase_id uuid;
  v_close_phase_id uuid;
BEGIN
  -- Get project IDs
  SELECT id INTO v_rev0_id FROM projects WHERE name = 'Tile Flooring Installation' AND revision_number = 0;
  SELECT id INTO v_rev1_id FROM projects WHERE name = 'Tile Flooring Installation' AND revision_number = 1;
  
  -- Get standard phase IDs
  SELECT id INTO v_prep_phase_id FROM standard_phases WHERE name = 'Prep';
  SELECT id INTO v_install_phase_id FROM standard_phases WHERE name = 'Install';
  SELECT id INTO v_close_phase_id FROM standard_phases WHERE name = 'Close Project';
  
  -- Update revision 1 operations to correct phases
  UPDATE template_operations 
  SET standard_phase_id = v_prep_phase_id
  WHERE project_id = v_rev1_id
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
  
  UPDATE template_operations
  SET standard_phase_id = v_install_phase_id
  WHERE project_id = v_rev1_id
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
  
  UPDATE template_operations
  SET standard_phase_id = v_close_phase_id
  WHERE project_id = v_rev1_id
  AND name IN (
    'Complete project',
    'Prep for pickup',
    'Materials disposal',
    'Post-install inspection'
  );
  
  -- Rebuild phases JSON for revision 1
  UPDATE projects
  SET phases = rebuild_phases_json_from_templates(v_rev1_id),
      updated_at = now()
  WHERE id = v_rev1_id;
  
  RAISE NOTICE 'Fixed revision 1 template_operations and rebuilt phases JSON';
END $$;
