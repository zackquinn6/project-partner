
-- Rebuild revision 1 phases JSON
DO $$
DECLARE
  v_revision_id uuid;
  rebuilt_phases jsonb;
BEGIN
  -- Get revision 1 project ID
  SELECT id INTO v_revision_id 
  FROM projects 
  WHERE name = 'Tile Flooring Installation' AND revision_number = 1;
  
  IF v_revision_id IS NOT NULL THEN
    -- Rebuild phases JSON from template data
    rebuilt_phases := rebuild_phases_json_from_templates(v_revision_id);
    
    -- Update the project
    UPDATE projects
    SET phases = rebuilt_phases,
        updated_at = now()
    WHERE id = v_revision_id;
    
    RAISE NOTICE 'Rebuilt phases JSON for revision 1. Phase count: %', jsonb_array_length(rebuilt_phases);
  END IF;
END $$;
