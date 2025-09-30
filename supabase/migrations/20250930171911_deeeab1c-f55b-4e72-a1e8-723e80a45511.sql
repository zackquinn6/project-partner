
-- Fix Kickoff phase for Tile Flooring Installation project
-- The Kickoff operation and steps were never migrated to the normalized structure

-- Get the Kickoff standard phase ID and latest project ID
DO $$
DECLARE
  kickoff_phase_id UUID;
  tile_project_id UUID;
  new_operation_id UUID;
BEGIN
  -- Get Kickoff standard phase ID
  SELECT id INTO kickoff_phase_id 
  FROM public.standard_phases 
  WHERE name = 'Kickoff';
  
  -- Get the latest Tile Flooring Installation project
  SELECT id INTO tile_project_id
  FROM public.projects
  WHERE name = 'Tile Flooring Installation'
  ORDER BY revision_number DESC
  LIMIT 1;
  
  -- Insert the Kickoff operation
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
    0  -- Put at the beginning
  ) RETURNING id INTO new_operation_id;
  
  -- Insert the DIY Profile step
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
    new_operation_id,
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
  
  -- Update display_order for all other operations to shift them down
  UPDATE public.template_operations
  SET display_order = display_order + 1
  WHERE project_id = tile_project_id
    AND id != new_operation_id;
    
END $$;
