-- Seed "coming-soon" project templates for upcoming catalog items
-- All projects live in the existing "projects" table; this script
-- inserts or updates templates to use the new 'coming-soon' status.

BEGIN;

-- 1) Ensure the publish_status CHECK constraint accepts 'coming-soon'.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage c
    JOIN information_schema.table_constraints tc
      ON c.constraint_name = tc.constraint_name
     AND c.constraint_schema = tc.constraint_schema
    WHERE c.table_name = 'projects'
      AND c.column_name = 'publish_status'
      AND tc.constraint_type = 'CHECK'
      AND c.constraint_name = 'projects_publish_status_check'
  ) THEN
    ALTER TABLE projects DROP CONSTRAINT projects_publish_status_check;
    ALTER TABLE projects
      ADD CONSTRAINT projects_publish_status_check
      CHECK (publish_status IN ('draft','beta-testing','published','archived','coming-soon'));
  END IF;
END;
$$;

-- 2) Ensure the publish_status enum (if used) accepts 'coming-soon'.
-- If publish_status is a plain TEXT/VARCHAR column, this section is harmless.
DO $$
BEGIN
  -- For enum-based setups: add the value if it does not exist.
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'project_publish_status'
      AND e.enumlabel = 'draft'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'project_publish_status'
        AND e.enumlabel = 'coming-soon'
    ) THEN
      ALTER TYPE project_publish_status ADD VALUE 'coming-soon';
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- Enum type does not exist; publish_status is likely TEXT. Do nothing.
    NULL;
END;
$$;

-- 3) Helper: upsert a "coming soon" template by name.
--    If a template with this name exists, just set publish_status to 'coming-soon'
--    and keep all its existing architecture (phases, links, metadata).
--    If it does not exist, insert a bare template row with minimal metadata.
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
  -- Kitchen Cabinet Installation
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Kitchen Cabinet Installation'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Kitchen Cabinet Installation',
      'Plan, hang, and level new kitchen cabinets for a pro-quality finish.',
      ARRAY['Kitchen','Interior Carpentry'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Interior Door Replacement (prehung or slab)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Interior Door Replacement (prehung or slab)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Interior Door Replacement (prehung or slab)',
      'Replace interior doors with new prehung units or slabs and tune fitment.',
      ARRAY['Doors & Windows','Interior Carpentry'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Baseboard + Trim Installation
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Baseboard + Trim Installation'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Baseboard + Trim Installation',
      'Install baseboard and trim with tight joints and clean transitions.',
      ARRAY['Interior Carpentry'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Framing & Building a Non‑Load‑Bearing Wall
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Framing & Building a Non‑Load‑Bearing Wall'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Framing & Building a Non‑Load‑Bearing Wall',
      'Lay out, frame, and stand a non-structural interior wall.',
      ARRAY['Interior Carpentry','Walls & Drywall'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Closet System Build‑Out (shelves, rods, organizers)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Closet System Build‑Out (shelves, rods, organizers)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Closet System Build‑Out (shelves, rods, organizers)',
      'Design and install a custom closet layout with shelves, rods, and organizers.',
      ARRAY['Storage & Organization','Interior Carpentry'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Deck Board Replacement or Deck Resurfacing
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Deck Board Replacement or Deck Resurfacing'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Deck Board Replacement or Deck Resurfacing',
      'Remove tired decking, repair framing as needed, and install new deck boards.',
      ARRAY['Decks & Patios','Exterior Carpentry'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Interior Stair Refacing (treads, risers, railings)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Interior Stair Refacing (treads, risers, railings)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Interior Stair Refacing (treads, risers, railings)',
      'Upgrade interior stairs with new treads, risers, and railings.',
      ARRAY['Interior Carpentry'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Interior Painting (walls, ceilings, trim)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Interior Painting (walls, ceilings, trim)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Interior Painting (walls, ceilings, trim)',
      'Prep, prime, and paint interior walls, ceilings, and trim.',
      ARRAY['Painting & Finishing','Interior'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Tile Flooring Installation (builds on existing template if present)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Tile Flooring Installation'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    -- Use the existing Tile Flooring Installation template but mark as coming soon
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Tile Flooring Installation',
      'Install durable tile flooring over a properly prepared substrate.',
      ARRAY['Flooring','Tile'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Tile Backsplash Installation
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Tile Backsplash Installation'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Tile Backsplash Installation',
      'Add a kitchen or bath backsplash with clean edges and aligned patterns.',
      ARRAY['Tile','Kitchen'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Laminate or Engineered Flooring Installation
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Laminate or Engineered Flooring Installation'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Laminate or Engineered Flooring Installation',
      'Install laminate or engineered flooring with clean transitions and expansion gaps.',
      ARRAY['Flooring'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Drywall Repair + Finishing (patch, tape, mud, sand)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Drywall Repair + Finishing (patch, tape, mud, sand)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Drywall Repair + Finishing (patch, tape, mud, sand)',
      'Repair drywall and finish seams to a paint-ready surface.',
      ARRAY['Walls & Drywall'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Wallpaper Installation or Removal
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Wallpaper Installation or Removal'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Wallpaper Installation or Removal',
      'Strip old wallpaper cleanly or hang new paper with tight seams.',
      ARRAY['Painting & Finishing','Decor'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Shiplap or Accent Wall Installation
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Shiplap or Accent Wall Installation'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Shiplap or Accent Wall Installation',
      'Create a feature wall with shiplap or accent paneling.',
      ARRAY['Interior Carpentry','Walls & Drywall'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Vanity Replacement (sink, faucet, drain)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Vanity Replacement (sink, faucet, drain)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Vanity Replacement (sink, faucet, drain)',
      'Swap a bathroom vanity, sink, and faucet while managing plumbing in tight spaces.',
      ARRAY['Bathroom','Plumbing'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Toilet Replacement (builds on existing template if present)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Toilet Replacement'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    -- Use the existing Toilet Replacement template but mark as coming soon
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Toilet Replacement',
      'Remove and replace a toilet with a new seal and leak-free connections.',
      ARRAY['Bathroom','Plumbing'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Shower Fixture Upgrade (valve trim, showerhead, handle)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Shower Fixture Upgrade (valve trim, showerhead, handle)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Shower Fixture Upgrade (valve trim, showerhead, handle)',
      'Upgrade shower trim and fixtures while respecting existing valves and tile.',
      ARRAY['Bathroom','Plumbing'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Garbage Disposal Installation
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Garbage Disposal Installation'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Garbage Disposal Installation',
      'Install or replace a kitchen garbage disposal with proper mounting and plumbing.',
      ARRAY['Kitchen','Plumbing'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Kitchen Sink Replacement (undermount or drop‑in)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Kitchen Sink Replacement (undermount or drop‑in)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Kitchen Sink Replacement (undermount or drop‑in)',
      'Replace a kitchen sink and reconnect plumbing with solid support and clean sealant.',
      ARRAY['Kitchen','Plumbing'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Window Trim Replacement (interior casing + stool)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Window Trim Replacement (interior casing + stool)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Window Trim Replacement (interior casing + stool)',
      'Replace interior window casing and stool for a cleaner, better-sealed opening.',
      ARRAY['Doors & Windows','Interior Carpentry'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Exterior Door Weatherproofing (sill pan, flashing, seals)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Exterior Door Weatherproofing (sill pan, flashing, seals)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Exterior Door Weatherproofing (sill pan, flashing, seals)',
      'Upgrade an exterior door’s water and air defenses with sill pans, flashing, and seals.',
      ARRAY['Doors & Windows','Insulation & Weatherproofing'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Storm Door Installation
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Storm Door Installation'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Storm Door Installation',
      'Install a new storm door that closes smoothly and seals well with the entry door.',
      ARRAY['Doors & Windows','Exterior Carpentry'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Outlet/Switch Replacement
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Outlet/Switch Replacement'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Outlet/Switch Replacement',
      'Replace outlets, GFCI protection, and switches (including dimmers and smart switches) safely.',
      ARRAY['Electrical'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Light Fixture Replacement (ceiling, wall, vanity)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Light Fixture Replacement (ceiling, wall, vanity)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Light Fixture Replacement (ceiling, wall, vanity)',
      'Swap light fixtures and support them properly with clean finishes at ceilings and walls.',
      ARRAY['Lighting & Electrical'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

  -- Ceiling Fan Installation (with or without existing box upgrade)
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Ceiling Fan Installation (with or without existing box upgrade)'
    AND is_current_version = true
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    UPDATE projects
    SET publish_status = 'coming-soon'
    WHERE id = v_project_id;
  ELSE
    INSERT INTO projects (name, description, category, publish_status, is_current_version, user_id)
    VALUES (
      'Ceiling Fan Installation (with or without existing box upgrade)',
      'Install or upgrade a ceiling fan with fan-rated support and balanced blades.',
      ARRAY['Lighting & Electrical'],
      'coming-soon',
      true,
      v_owner_id
    );
  END IF;

END;
$$;

COMMIT;

