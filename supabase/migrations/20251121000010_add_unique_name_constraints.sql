-- Add unique constraints for project names and phase names within projects
-- This ensures no duplicate project names globally
-- And no duplicate phase names within a single project

-- 1. Add unique constraint for project names (case-insensitive)
-- First, check if there are any existing duplicates and rename them
DO $$
DECLARE
  duplicate_rec RECORD;
  counter INTEGER;
  new_name TEXT;
BEGIN
  -- Find and rename duplicate project names (case-insensitive)
  -- Keep the first occurrence (by id) and rename the rest
  FOR duplicate_rec IN
    WITH ranked_projects AS (
      SELECT 
        id,
        name,
        LOWER(TRIM(name)) as normalized_name,
        ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY id) as rn
      FROM public.projects
      WHERE name IS NOT NULL AND TRIM(name) != ''
    )
    SELECT id, name, normalized_name
    FROM ranked_projects
    WHERE rn > 1
    ORDER BY normalized_name, id
  LOOP
    -- Rename duplicates by appending a counter
    counter := 1;
    new_name := duplicate_rec.name || ' (' || counter || ')';
    
    -- Ensure the new name doesn't already exist
    WHILE EXISTS (
      SELECT 1 FROM public.projects 
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(new_name))
    ) LOOP
      counter := counter + 1;
      new_name := duplicate_rec.name || ' (' || counter || ')';
    END LOOP;
    
    -- Update the project name
    UPDATE public.projects
    SET name = new_name
    WHERE id = duplicate_rec.id;
    
    RAISE NOTICE 'Renamed duplicate project "%" to "%"', duplicate_rec.name, new_name;
  END LOOP;
END $$;

-- Create a unique index on project names (case-insensitive)
-- This will prevent duplicate project names
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name_unique 
ON public.projects (LOWER(TRIM(name)))
WHERE name IS NOT NULL AND TRIM(name) != '';

COMMENT ON INDEX idx_projects_name_unique IS 'Ensures project names are unique (case-insensitive). Prevents duplicate project names globally.';

-- 2. Add unique constraint for phase names within a project
-- First, check if there are any existing duplicates and rename them
DO $$
DECLARE
  duplicate_rec RECORD;
  counter INTEGER;
  new_name TEXT;
BEGIN
  -- Find and rename duplicate phase names within each project (case-insensitive)
  -- Keep the first occurrence (by id) and rename the rest
  FOR duplicate_rec IN
    WITH ranked_phases AS (
      SELECT 
        id,
        project_id,
        name,
        LOWER(TRIM(name)) as normalized_name,
        ROW_NUMBER() OVER (PARTITION BY project_id, LOWER(TRIM(name)) ORDER BY id) as rn
      FROM public.project_phases
      WHERE name IS NOT NULL AND TRIM(name) != ''
    )
    SELECT id, project_id, name, normalized_name
    FROM ranked_phases
    WHERE rn > 1
    ORDER BY project_id, normalized_name, id
  LOOP
    -- Rename duplicates by appending a counter
    counter := 1;
    new_name := duplicate_rec.name || ' (' || counter || ')';
    
    -- Ensure the new name doesn't already exist within the same project
    WHILE EXISTS (
      SELECT 1 FROM public.project_phases 
      WHERE project_id = duplicate_rec.project_id
        AND LOWER(TRIM(name)) = LOWER(TRIM(new_name))
    ) LOOP
      counter := counter + 1;
      new_name := duplicate_rec.name || ' (' || counter || ')';
    END LOOP;
    
    -- Update the phase name
    UPDATE public.project_phases
    SET name = new_name
    WHERE id = duplicate_rec.id;
    
    RAISE NOTICE 'Renamed duplicate phase "%" in project % to "%"', duplicate_rec.name, duplicate_rec.project_id, new_name;
  END LOOP;
END $$;

-- Create a unique index on phase names within a project (case-insensitive)
-- This will prevent duplicate phase names within the same project
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_phases_project_name_unique 
ON public.project_phases (project_id, LOWER(TRIM(name)))
WHERE name IS NOT NULL AND TRIM(name) != '';

COMMENT ON INDEX idx_project_phases_project_name_unique IS 'Ensures phase names are unique within each project (case-insensitive). Phases can have the same name across different projects, but not within the same project.';

-- 3. Update add_custom_project_phase function to check for duplicates before inserting
CREATE OR REPLACE FUNCTION public.add_custom_project_phase(
  p_project_id uuid,
  p_phase_name text DEFAULT 'New Phase',
  p_phase_description text DEFAULT 'Phase description'
)
RETURNS project_phases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_display_order integer;
  inserted_phase project_phases%ROWTYPE;
  effective_name text := COALESCE(NULLIF(TRIM(p_phase_name), ''), 'New Phase');
  existing_phase_id uuid;
  standard_project_id CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
  should_be_standard boolean;
  existing_standard_phase_id uuid;
  default_operation_id uuid;
BEGIN
  -- Check for duplicate phase name within this project (case-insensitive)
  SELECT id INTO existing_phase_id
  FROM project_phases
  WHERE project_id = p_project_id
    AND LOWER(TRIM(name)) = LOWER(TRIM(effective_name))
  LIMIT 1;

  IF existing_phase_id IS NOT NULL THEN
    RAISE EXCEPTION 'A phase with the name "%" already exists in this project. Please choose a unique name.', effective_name;
  END IF;

  -- Determine if this phase should be marked as standard
  -- If adding to Standard Project Foundation, mark as standard
  should_be_standard := (p_project_id = standard_project_id);

  SELECT COALESCE(MAX(display_order), 0) + 10
  INTO next_display_order
  FROM project_phases
  WHERE project_id = p_project_id;

  INSERT INTO project_phases (
    project_id,
    name,
    description,
    display_order,
    is_standard,
    standard_phase_id
  )
  VALUES (
    p_project_id,
    effective_name,
    COALESCE(p_phase_description, 'Phase description'),
    next_display_order,
    should_be_standard,
    NULL  -- Will be set if this becomes a standard phase
  )
  RETURNING *
  INTO inserted_phase;

  -- If this is a standard phase, create or link to standard_phases entry
  IF should_be_standard THEN
    -- Check if standard_phase entry exists
    SELECT id INTO existing_standard_phase_id
    FROM standard_phases
    WHERE name = effective_name
    LIMIT 1;

    IF existing_standard_phase_id IS NULL THEN
      -- Create new standard_phase entry
      INSERT INTO standard_phases (
        name,
        description,
        display_order,
        is_locked,
        position_rule,
        position_value
      )
      VALUES (
        effective_name,
        COALESCE(p_phase_description, 'Phase description'),
        999,  -- Custom standard phases get high display_order
        true,  -- Lock standard phases
        'last',  -- Default position rule
        NULL
      )
      RETURNING id INTO existing_standard_phase_id;

      -- Update project_phases to link to standard_phase
      UPDATE project_phases
      SET standard_phase_id = existing_standard_phase_id
      WHERE id = inserted_phase.id;
    ELSE
      -- Link to existing standard_phase
      UPDATE project_phases
      SET standard_phase_id = existing_standard_phase_id
      WHERE id = inserted_phase.id;
    END IF;
  END IF;

  -- Create default operation
  INSERT INTO template_operations (
    project_id,
    phase_id,
    name,
    description,
    display_order,
    flow_type,
    custom_phase_name,
    custom_phase_description,
    custom_phase_display_order
  )
  VALUES (
    p_project_id,
    inserted_phase.id,
    'New Operation',
    'Operation description',
    0,
    'prime',
    inserted_phase.name,
    inserted_phase.description,
    inserted_phase.display_order
  )
  RETURNING id INTO default_operation_id;

  -- Create default step for the operation
  INSERT INTO template_steps (
    operation_id,
    step_number,
    step_title,
    description,
    display_order,
    skill_level
  )
  VALUES (
    default_operation_id,
    1,
    'New Step',
    'Step description',
    0,
    (SELECT skill_level FROM projects WHERE id = p_project_id)
  );

  RETURN inserted_phase;
END;
$$;

COMMENT ON FUNCTION public.add_custom_project_phase IS 'Adds a custom phase to a project. Checks for duplicate phase names within the project (case-insensitive) and raises an error if a duplicate is found.';

