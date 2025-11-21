-- Set all phases of "Toilet replacement" project to non-standard
-- except for the 4 core standard phases: Kickoff, Planning, Ordering, Close Project

DO $$
DECLARE
  v_project_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Find the project "Toilet replacement" (case-insensitive, partial match)
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE LOWER(name) LIKE '%toilet%replacement%'
     OR LOWER(name) = 'toilet replacement'
  LIMIT 1;

  -- Check if project was found
  IF v_project_id IS NULL THEN
    RAISE NOTICE 'Project "Toilet replacement" not found. Checking for similar project names...';
    -- List projects with "toilet" in the name for debugging
    FOR v_project_id IN 
      SELECT id FROM public.projects WHERE LOWER(name) LIKE '%toilet%'
    LOOP
      RAISE NOTICE 'Found project with "toilet" in name: %', (SELECT name FROM public.projects WHERE id = v_project_id);
    END LOOP;
    RETURN;
  END IF;

  RAISE NOTICE 'Found project with ID: %', v_project_id;

  -- STEP 1: Update template_operations to set both is_standard_phase = false AND custom_phase_name
  -- This must be done atomically to satisfy the custom_phase_metadata_check constraint
  UPDATE public.template_operations to_op
  SET 
    is_standard_phase = false,
    custom_phase_name = pp.name,
    custom_phase_description = pp.description,
    custom_phase_display_order = pp.display_order
  FROM public.project_phases pp
  WHERE to_op.phase_id = pp.id
    AND pp.project_id = v_project_id
    AND pp.name NOT IN ('Kickoff', 'Planning', 'Ordering', 'Close Project')
    AND to_op.is_standard_phase = true;  -- Only update operations that are currently marked as standard

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % operations to non-standard with custom_phase_name', v_updated_count;

  -- STEP 2: Now update phases to is_standard = false
  -- The trigger will update is_standard_phase in template_operations, but it should already be false
  UPDATE public.project_phases pp
  SET is_standard = false
  WHERE pp.project_id = v_project_id
    AND pp.name NOT IN ('Kickoff', 'Planning', 'Ordering', 'Close Project');

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % phases to non-standard for project "Toilet replacement"', v_updated_count;

END $$;

