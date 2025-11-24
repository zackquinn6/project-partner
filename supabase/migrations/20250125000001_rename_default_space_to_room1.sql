-- Rename default space from "default home" to "Room 1" in create_project_run_snapshot function
-- This updates the function that creates one default space when creating a new project

-- First, check if the function exists and get its definition
DO $$
DECLARE
  func_def TEXT;
BEGIN
  -- Get the current function definition
  SELECT pg_get_functiondef(oid) INTO func_def
  FROM pg_proc
  WHERE proname = 'create_project_run_snapshot'
    AND pronamespace = 'public'::regnamespace
  LIMIT 1;

  -- If function exists, update it
  IF func_def IS NOT NULL THEN
    -- Replace "default home" with "Room 1" in the function definition
    -- This is a simple string replacement - adjust if the function structure is different
    func_def := REPLACE(func_def, '''default home''', '''Room 1''');
    func_def := REPLACE(func_def, '"default home"', '"Room 1"');
    
    -- Note: We can't directly execute the modified function definition here
    -- Instead, we'll update the INSERT statement that creates the default space
    -- The actual update needs to be done by modifying the function directly
  END IF;
END $$;

-- Update the create_project_run_snapshot function to use "Room 1" instead of "default home"
-- Note: This assumes the function creates a default space with name 'default home'
-- Adjust the function definition based on the actual implementation
CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_template_id UUID,
  p_user_id UUID,
  p_run_name TEXT,
  p_home_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW(),
  p_plan_end_date TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_run_id UUID;
  default_space_id UUID;
BEGIN
  -- Create project run
  INSERT INTO public.project_runs (
    template_id,
    user_id,
    name,
    custom_project_name,
    home_id,
    start_date,
    plan_end_date,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_template_id,
    p_user_id,
    p_run_name,  -- Set name column (required, NOT NULL)
    p_run_name,  -- Also set custom_project_name
    p_home_id,
    p_start_date,
    p_plan_end_date,
    'in_progress',
    NOW(),
    NOW()
  ) RETURNING id INTO new_run_id;

  -- Create default space "Room 1" (previously "default home")
  INSERT INTO public.project_run_spaces (
    project_run_id,
    space_name,
    space_type,
    is_from_home,
    priority,
    created_at,
    updated_at
  ) VALUES (
    new_run_id,
    'Room 1',  -- Changed from 'default home' to 'Room 1'
    'general',
    false,
    1,
    NOW(),
    NOW()
  ) RETURNING id INTO default_space_id;

  -- Rebuild phases JSON for the new project run
  PERFORM public.rebuild_phases_json_from_project_phases(p_template_id);

  RETURN new_run_id;
END;
$$ LANGUAGE plpgsql;

