-- Add unique constraints for project names and phase names within projects
-- This ensures no duplicate project names globally
-- And no duplicate phase names within a single project

-- 1. Add unique constraint for project names (case-insensitive)
-- First, check if there are any existing duplicates and handle them
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Check for duplicate project names (case-insensitive)
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT LOWER(TRIM(name)) as normalized_name, COUNT(*) as cnt
    FROM public.projects
    WHERE name IS NOT NULL AND TRIM(name) != ''
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate project names. Please resolve these before applying the constraint.', duplicate_count;
    -- Don't fail the migration, but warn the user
  END IF;
END $$;

-- Create a unique index on project names (case-insensitive)
-- This will prevent duplicate project names
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name_unique 
ON public.projects (LOWER(TRIM(name)))
WHERE name IS NOT NULL AND TRIM(name) != '';

COMMENT ON INDEX idx_projects_name_unique IS 'Ensures project names are unique (case-insensitive). Prevents duplicate project names globally.';

-- 2. Add unique constraint for phase names within a project
-- First, check if there are any existing duplicates and handle them
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Check for duplicate phase names within projects (case-insensitive)
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT project_id, LOWER(TRIM(name)) as normalized_name, COUNT(*) as cnt
    FROM public.project_phases
    WHERE name IS NOT NULL AND TRIM(name) != ''
    GROUP BY project_id, LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate phase names within projects. Please resolve these before applying the constraint.', duplicate_count;
    -- Don't fail the migration, but warn the user
  END IF;
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
  );

  RETURN inserted_phase;
END;
$$;

COMMENT ON FUNCTION public.add_custom_project_phase IS 'Adds a custom phase to a project. Checks for duplicate phase names within the project (case-insensitive) and raises an error if a duplicate is found.';

