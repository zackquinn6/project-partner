-- Ensure add_custom_project_phase sets custom phase metadata on default operation
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
  default_operation_id uuid;
  effective_name text := COALESCE(NULLIF(p_phase_name, ''), 'New Phase');
  effective_description text := COALESCE(p_phase_description, 'Phase description');
BEGIN
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
    effective_description,
    next_display_order,
    false,
    NULL
  )
  RETURNING *
  INTO inserted_phase;

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

  INSERT INTO template_steps (
    operation_id,
    step_number,
    step_title,
    description,
    content_sections,
    materials,
    tools,
    outputs,
    apps,
    estimated_time_minutes,
    display_order,
    flow_type,
    step_type
  )
  VALUES (
    default_operation_id,
    1,
    'New Step',
    'Step description',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    0,
    0,
    'prime',
    'prime'
  );

  RETURN inserted_phase;
END;
$$;

