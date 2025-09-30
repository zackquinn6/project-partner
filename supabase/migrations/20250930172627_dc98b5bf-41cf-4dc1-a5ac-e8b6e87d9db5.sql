
-- Fix the Tile Flooring Installation project's phase mappings
-- Map operations to correct standard phases based on their names

DO $$
DECLARE
  tile_project_id UUID;
  kickoff_phase_id UUID;
  planning_phase_id UUID;
  ordering_phase_id UUID;
  close_phase_id UUID;
  new_kickoff_op_id UUID;
BEGIN
  -- Get the latest Tile Flooring Installation project
  SELECT id INTO tile_project_id
  FROM public.projects
  WHERE name = 'Tile Flooring Installation'
  ORDER BY revision_number DESC
  LIMIT 1;
  
  -- Get standard phase IDs
  SELECT id INTO kickoff_phase_id FROM public.standard_phases WHERE name = 'Kickoff';
  SELECT id INTO planning_phase_id FROM public.standard_phases WHERE name = 'Planning';
  SELECT id INTO ordering_phase_id FROM public.standard_phases WHERE name = 'Ordering';
  SELECT id INTO close_phase_id FROM public.standard_phases WHERE name = 'Close Project';
  
  -- First, delete any existing Kickoff operation to avoid duplicates
  DELETE FROM public.template_operations 
  WHERE project_id = tile_project_id 
    AND name = 'Kickoff'
    AND standard_phase_id = kickoff_phase_id;
  
  -- Create the Kickoff operation
  INSERT INTO public.template_operations (
    project_id,
    standard_phase_id,
    name,
    description,
    display_order
  ) VALUES (
    tile_project_id,
    kickoff_phase_id,
    'Kickoff',
    'Essential project setup and agreement',
    0
  ) RETURNING id INTO new_kickoff_op_id;
  
  -- Create the DIY Profile step
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
  ) VALUES (
    new_kickoff_op_id,
    1,
    'DIY Profile',
    'Complete your DIY profile for personalized project guidance',
    '[{"type": "text", "content": "Set up your DIY profile to receive personalized project recommendations, tool suggestions, and guidance tailored to your skill level and preferences."}]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[{"id": "diy-profile-output", "name": "DIY Profile Complete", "type": "none", "description": "Personal DIY profile completed and saved"}]'::jsonb,
    15,
    1
  );
  
  -- Update display_order for all other operations (shift by 1)
  UPDATE public.template_operations
  SET display_order = display_order + 1
  WHERE project_id = tile_project_id
    AND id != new_kickoff_op_id;
  
  -- Map operations to Close Project phase based on name
  UPDATE public.template_operations
  SET standard_phase_id = close_phase_id
  WHERE project_id = tile_project_id
    AND name IN (
      'Complete project',
      'Prep for pickup',
      'Materials disposal',
      'Post-install inspection'
    );
  
  -- Map operations to Ordering phase
  UPDATE public.template_operations
  SET standard_phase_id = ordering_phase_id
  WHERE project_id = tile_project_id
    AND name IN (
      'Shopping Checklist',
      'Tool & Material Ordering'
    );
  
  -- All other operations stay in Planning phase (already set)
  
  RAISE NOTICE 'Successfully created Kickoff operation and remapped phase assignments';
END $$;
