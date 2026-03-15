-- Replace create_project_revision_v2 so it no longer references difficulty_level.
-- Difficulty has been replaced by effort_level and skill_level; the projects table no longer has difficulty_level.

CREATE OR REPLACE FUNCTION public.create_project_revision_v2(
  source_project_id uuid,
  revision_notes_text text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_id uuid;
  next_rev int;
  new_id uuid;
BEGIN
  -- Resolve parent: source's parent if it's a revision, else source itself (root).
  SELECT p.parent_project_id INTO parent_id
  FROM projects p
  WHERE p.id = source_project_id;
  IF parent_id IS NULL THEN
    parent_id := source_project_id;
  END IF;

  SELECT COALESCE(MAX(revision_number), 0) + 1 INTO next_rev
  FROM projects
  WHERE parent_project_id = parent_id;

  -- Insert new project row (no difficulty_level; use effort_level and skill_level from source).
  INSERT INTO projects (
    budget_per_typical_size,
    budget_per_unit,
    category,
    cover_image,
    created_at,
    description,
    effort_level,
    estimated_cost,
    estimated_time,
    estimated_total_time,
    icon,
    id,
    images,
    is_standard,
    item_type,
    name,
    parent_project_id,
    phases,
    project_challenges,
    project_type,
    publish_status,
    revision_notes,
    revision_number,
    scaling_unit,
    skill_level,
    tags,
    typical_project_size,
    updated_at,
    user_id,
    visibility_status,
    is_current_version
  )
  SELECT
    p.budget_per_typical_size,
    p.budget_per_unit,
    p.category,
    p.cover_image,
    now(),
    p.description,
    p.effort_level,
    p.estimated_cost,
    p.estimated_time,
    p.estimated_total_time,
    p.icon,
    gen_random_uuid(),
    p.images,
    p.is_standard,
    p.item_type,
    p.name,
    source_project_id,
    p.phases,
    p.project_challenges,
    p.project_type,
    'draft',
    revision_notes_text,
    next_rev,
    p.scaling_unit,
    p.skill_level,
    p.tags,
    p.typical_project_size,
    now(),
    p.user_id,
    p.visibility_status,
    true
  FROM projects p
  WHERE p.id = source_project_id
  RETURNING id INTO new_id;

  IF new_id IS NULL THEN
    RAISE EXCEPTION 'create_project_revision_v2: source project not found or insert failed';
  END IF;

  -- Mark source as no longer current.
  UPDATE projects
  SET is_current_version = false
  WHERE id = source_project_id;

  -- Copy project_phases to the new revision.
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
    source_project_name,
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
    pp.source_project_name,
    now()
  FROM project_phases pp
  WHERE pp.project_id = source_project_id;

  -- Rebuild phases JSON for the new project.
  PERFORM rebuild_phases_json_from_project_phases(new_id);

  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.create_project_revision_v2(uuid, text) IS
  'Creates a new project revision from a source project. Uses effort_level and skill_level (difficulty_level is deprecated).';
