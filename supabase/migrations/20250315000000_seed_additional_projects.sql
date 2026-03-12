-- Seed additional template projects into projects table
-- using visibility_status for catalog behavior.

BEGIN;

DO $$
DECLARE
  v_project_id UUID;
  v_owner_id UUID;
BEGIN
  -- Reuse an existing project owner so seeded templates have a valid user_id.
  SELECT user_id
  INTO v_owner_id
  FROM projects
  WHERE user_id IS NOT NULL
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'No existing projects with non-null user_id found. Seed a project first, then re-run this migration.';
  END IF;

  -- 1) Self-leveler application
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Self-leveler application'
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    -- Ensure it has sane defaults
    UPDATE projects
    SET
      visibility_status = COALESCE(visibility_status, 'coming-soon'),
      publish_status    = COALESCE(publish_status, 'draft')
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (
      name,
      description,
      category,
      publish_status,
      visibility_status,
      user_id
    )
    VALUES (
      'Self-leveler application',
      'Prepare and pour self-leveling underlayment to flatten a floor before new finishes.',
      ARRAY['Flooring','Masonry & Concrete'],
      'draft',
      'coming-soon',
      v_owner_id
    );
  END IF;

  -- 2) Tile Floor Demolition
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Tile Floor Demolition'
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET
      visibility_status = COALESCE(visibility_status, 'coming-soon'),
      publish_status    = COALESCE(publish_status, 'draft')
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (
      name,
      description,
      category,
      publish_status,
      visibility_status,
      user_id
    )
    VALUES (
      'Tile Floor Demolition',
      'Remove existing tile flooring and underlayment safely while protecting structure and adjacent finishes.',
      ARRAY['Flooring','Demolition'],
      'draft',
      'coming-soon',
      v_owner_id
    );
  END IF;

  -- 3) Dishwasher Replacement
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Dishwasher Replacement'
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET
      visibility_status = COALESCE(visibility_status, 'coming-soon'),
      publish_status    = COALESCE(publish_status, 'draft')
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (
      name,
      description,
      category,
      publish_status,
      visibility_status,
      user_id
    )
    VALUES (
      'Dishwasher Replacement',
      'Swap an existing dishwasher, handle water and drain connections, and level the new unit in the cabinet opening.',
      ARRAY['Kitchen','Plumbing'],
      'draft',
      'coming-soon',
      v_owner_id
    );
  END IF;

END;
$$;

COMMIT;

