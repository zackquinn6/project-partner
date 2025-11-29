-- create_project_run_snapshot function
-- 
-- Design: Uses relational tables (project_phases, template_operations, template_steps) as the ONLY source of truth
-- No fallbacks - if rebuild fails, the function fails with a clear error
-- This ensures project runs always have complete phases (standard + custom) from relational data

CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_template_id UUID,
  p_user_id UUID,
  p_run_name TEXT,
  p_home_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW(),
  p_plan_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_run_id UUID;
  user_home_id UUID;
  template_phases_json JSONB;
  has_operations_with_steps BOOLEAN;
BEGIN
  -- Step 1: Ensure user has a home with at least one room
  -- If p_home_id is provided, use it; otherwise find or create user's primary home
  IF p_home_id IS NOT NULL THEN
    user_home_id := p_home_id;
  ELSE
    -- Find user's primary home
    SELECT id INTO user_home_id
    FROM homes
    WHERE user_id = p_user_id AND is_primary = true
    LIMIT 1;
    
    -- If no primary home exists, create one
    IF user_home_id IS NULL THEN
      INSERT INTO homes (user_id, name, is_primary, created_at, updated_at)
      VALUES (p_user_id, 'My Home', true, NOW(), NOW())
      RETURNING id INTO user_home_id;
    END IF;
  END IF;
  
  -- Step 2: Rebuild phases JSON from relational tables (ONLY source of truth)
  -- This includes BOTH standard and custom phases from project_phases table
  SELECT public.rebuild_phases_json_from_project_phases(p_template_id) INTO template_phases_json;
  
  -- Validate that rebuild returned phases
  IF template_phases_json IS NULL 
     OR template_phases_json = '[]'::JSONB 
     OR jsonb_array_length(template_phases_json) = 0 THEN
    RAISE EXCEPTION 'Template project % has no phases in relational tables. Cannot create project run. Please ensure the template has phases in project_phases table.', p_template_id;
  END IF;
  
  -- Validate that phases have operations with steps
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(template_phases_json) AS phase
    WHERE jsonb_typeof(COALESCE(phase->'operations', 'null'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(phase->'operations', '[]'::jsonb)) > 0
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(phase->'operations') AS operation
        WHERE jsonb_typeof(COALESCE(operation->'steps', 'null'::jsonb)) = 'array'
          AND jsonb_array_length(COALESCE(operation->'steps', '[]'::jsonb)) > 0
      )
  ) INTO has_operations_with_steps;
  
  IF NOT has_operations_with_steps THEN
    RAISE EXCEPTION 'Template project % phases exist but have no operations with steps in relational tables. Cannot create project run. Template structure is incomplete.', p_template_id;
  END IF;
  
  -- Update template's phases JSONB with the rebuilt version (for consistency)
  UPDATE projects
  SET phases = template_phases_json
  WHERE id = p_template_id;
  
  -- Step 3: Create project run record with phases JSON from relational tables
  INSERT INTO project_runs (
    template_id,
    user_id,
    name,
    description,
    start_date,
    plan_end_date,
    status,
    home_id,
    progress,
    completed_steps,
    phases,
    created_at,
    updated_at
  )
  SELECT 
    p_template_id,
    p_user_id,
    p_run_name,
    description,
    p_start_date,
    COALESCE(p_plan_end_date, p_start_date + INTERVAL '30 days'),
    'not-started',
    user_home_id,
    0,
    '[]'::JSONB,
    template_phases_json,
    NOW(),
    NOW()
  FROM projects
  WHERE id = p_template_id
  RETURNING id INTO new_run_id;
  
  -- Step 4: Create default space for project run
  -- Default to "Room 1" if no spaces exist
  IF NOT EXISTS (
    SELECT 1 FROM project_run_spaces 
    WHERE project_run_id = new_run_id
  ) THEN
    INSERT INTO project_run_spaces (
      project_run_id,
      space_name,
      space_type,
      priority,
      created_at,
      updated_at
    )
    VALUES (
      new_run_id,
      'Room 1',
      'room',
      1,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN new_run_id;
EXCEPTION
  WHEN undefined_function THEN
    RAISE EXCEPTION 'rebuild_phases_json_from_project_phases function is not available. Cannot create project run. Please ensure the function exists in the database.';
  WHEN OTHERS THEN
    -- Clean up project run if something went wrong
    IF new_run_id IS NOT NULL THEN
      DELETE FROM project_runs WHERE id = new_run_id;
    END IF;
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.create_project_run_snapshot IS 
'Creates project run by rebuilding phases from relational tables (project_phases, template_operations, template_steps). No fallbacks - uses relational tables as the ONLY source of truth. Fails clearly if rebuild fails or returns incomplete data.';
