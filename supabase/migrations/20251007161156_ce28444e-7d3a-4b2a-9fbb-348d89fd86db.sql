-- Phase 4: Data Migration - Retrofit Existing Projects

-- Step 1: Clean up duplicate/old standard phases
DELETE FROM public.standard_phases 
WHERE name IN ('Prep', 'Install');

-- Step 2: Get the Tile Flooring Installation project ID and Standard Project ID
DO $$
DECLARE
  tile_project_id UUID := 'caa74687-63fc-4bd1-865b-032a043fdcbc';
  standard_project_id UUID := '00000000-0000-0000-0000-000000000001';
  kickoff_phase_id UUID;
  planning_phase_id UUID;
  ordering_phase_id UUID;
  close_phase_id UUID;
  
  -- Variables for copying operations
  old_operation_id UUID;
  new_operation_id UUID;
BEGIN
  -- Get standard phase IDs
  SELECT id INTO kickoff_phase_id FROM public.standard_phases WHERE name = 'Kickoff';
  SELECT id INTO planning_phase_id FROM public.standard_phases WHERE name = 'Planning';
  SELECT id INTO ordering_phase_id FROM public.standard_phases WHERE name = 'Ordering';
  SELECT id INTO close_phase_id FROM public.standard_phases WHERE name = 'Close Project';

  RAISE NOTICE 'Standard Phase IDs: Kickoff=%, Planning=%, Ordering=%, Close=%', 
    kickoff_phase_id, planning_phase_id, ordering_phase_id, close_phase_id;

  -- Check if project exists
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = tile_project_id) THEN
    RAISE NOTICE 'Found Tile Flooring Installation project: %', tile_project_id;
    
    -- Delete any existing template_operations for this project to start fresh
    DELETE FROM public.template_steps WHERE operation_id IN (
      SELECT id FROM public.template_operations WHERE project_id = tile_project_id
    );
    DELETE FROM public.template_operations WHERE project_id = tile_project_id;
    
    RAISE NOTICE 'Cleared existing template operations for Tile project';
    
    -- Copy ALL standard operations from Standard Project to Tile project
    -- This links the Tile project to standard phases
    FOR old_operation_id IN 
      SELECT id FROM public.template_operations 
      WHERE project_id = standard_project_id 
      ORDER BY display_order
    LOOP
      INSERT INTO public.template_operations (
        project_id,
        standard_phase_id,
        name,
        description,
        display_order
      )
      SELECT 
        tile_project_id,
        standard_phase_id,
        name,
        description,
        display_order
      FROM public.template_operations
      WHERE id = old_operation_id
      RETURNING id INTO new_operation_id;
      
      -- Copy all steps for this operation
      INSERT INTO public.template_steps (
        operation_id,
        step_number,
        step_title,
        description,
        content_sections,
        materials,
        tools,
        outputs,
        estimated_time_minutes,
        display_order
      )
      SELECT 
        new_operation_id,
        step_number,
        step_title,
        description,
        content_sections,
        materials,
        tools,
        outputs,
        estimated_time_minutes,
        display_order
      FROM public.template_steps
      WHERE operation_id = old_operation_id
      ORDER BY display_order;
    END LOOP;
    
    RAISE NOTICE 'Copied standard operations to Tile project';
    
    -- Rebuild phases JSON for Tile project
    UPDATE public.projects
    SET phases = rebuild_phases_json_from_templates(tile_project_id),
        updated_at = now()
    WHERE id = tile_project_id;
    
    RAISE NOTICE 'Rebuilt phases JSON for Tile project';
    
  ELSE
    RAISE NOTICE 'Tile Flooring Installation project not found - skipping migration';
  END IF;
END $$;

-- Step 3: Log the migration completion
DO $$
BEGIN
  PERFORM log_comprehensive_security_event(
    'data_migration_phase4_complete',
    'medium',
    'Completed Phase 4 data migration: Retrofitted existing projects with standard phase architecture',
    auth.uid(),
    NULL, NULL, NULL,
    jsonb_build_object(
      'migration_phase', 4,
      'projects_migrated', 'Tile Flooring Installation',
      'timestamp', now()
    )
  );
END $$;