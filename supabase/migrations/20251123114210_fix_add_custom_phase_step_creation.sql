-- Fix add_custom_project_phase to create default step
-- The previous migration was missing step creation which could cause issues

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
  -- If this is a standard phase, don't set custom_phase_name (must be NULL per constraint)
  -- If this is a custom phase, set custom_phase_name (required per constraint)
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
    CASE WHEN should_be_standard THEN NULL ELSE inserted_phase.name END,
    CASE WHEN should_be_standard THEN NULL ELSE inserted_phase.description END,
    CASE WHEN should_be_standard THEN NULL ELSE inserted_phase.display_order END
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

COMMENT ON FUNCTION public.add_custom_project_phase IS 'Adds a custom phase to a project. Checks for duplicate phase names within the project (case-insensitive) and raises an error if a duplicate is found. Creates a default operation and step for the new phase.';

