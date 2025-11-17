-- Add helper function to insert custom project phases with safe display order
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
BEGIN
  -- Determine the next available display order for the project
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
    COALESCE(NULLIF(p_phase_name, ''), 'New Phase'),
    COALESCE(p_phase_description, 'Phase description'),
    next_display_order,
    false,
    NULL
  )
  RETURNING *
  INTO inserted_phase;

  RETURN inserted_phase;
END;
$$;

