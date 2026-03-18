-- Update create_project_revision_v2 to stop referencing project_phases.source_project_name.
-- This column has been removed; the source project name should be resolved via source_project_id -> projects.

CREATE OR REPLACE FUNCTION public.create_project_revision_v2(source_project_id uuid, new_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO projects (
    name,
    description,
    category,
    difficulty_level,
    estimated_days,
    typical_project_size,
    created_at,
    user_id,
    visibility_status,
    is_current_version
  )
  SELECT
    new_name,
    p.description,
    p.category,
    p.difficulty_level,
    p.estimated_days,
    p.typical_project_size,
    now(),
    p.user_id,
    p.visibility_status,
    true
  FROM projects p
  WHERE p.id = create_project_revision_v2.source_project_id
  RETURNING id INTO new_id;

  IF new_id IS NULL THEN
    RAISE EXCEPTION 'create_project_revision_v2: source project not found or insert failed';
  END IF;

  UPDATE projects
  SET is_current_version = false
  WHERE id = create_project_revision_v2.source_project_id;

  INSERT INTO project_phases (
    created_at,
    description,
    display_order,
    id,
    is_linked,
    is_standard,
    name,
    position_rule,
    position_value,
    project_id,
    source_project_id,
    updated_at
  )
  SELECT
    pp.created_at,
    pp.description,
    pp.display_order,
    gen_random_uuid(),
    pp.is_linked,
    pp.is_standard,
    pp.name,
    pp.position_rule,
    pp.position_value,
    new_id,
    pp.source_project_id,
    now()
  FROM project_phases pp
  WHERE pp.project_id = create_project_revision_v2.source_project_id;

  PERFORM rebuild_phases_json_from_project_phases(new_id);

  RETURN new_id;
END;
$$;

