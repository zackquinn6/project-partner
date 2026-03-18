-- Consolidated migration:
-- - project_phases: incorporate linking fields via source_project_id, remove duplicative source_project_name
-- - project_risks / project_run_risks: add severity
-- - create_project_revision_v2: remove references to removed column

-- project_phases: linking fields + remove duplicated name
ALTER TABLE public.project_phases
  ADD COLUMN IF NOT EXISTS is_linked boolean,
  ADD COLUMN IF NOT EXISTS source_project_id uuid;

ALTER TABLE public.project_phases
  DROP COLUMN IF EXISTS source_project_name;

-- Ensure foreign key from source_project_id → projects.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_phases_source_project_id_fkey'
      AND conrelid = 'public.project_phases'::regclass
  ) THEN
    ALTER TABLE public.project_phases
      ADD CONSTRAINT project_phases_source_project_id_fkey
      FOREIGN KEY (source_project_id)
      REFERENCES public.projects(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

-- Risks: add severity
ALTER TABLE public.project_risks
  ADD COLUMN IF NOT EXISTS severity TEXT NULL;

ALTER TABLE public.project_run_risks
  ADD COLUMN IF NOT EXISTS severity TEXT NULL;

-- Functions: update create_project_revision_v2 to stop referencing removed column
-- Postgres cannot change input parameter names via CREATE OR REPLACE for an existing signature.
DROP FUNCTION IF EXISTS public.create_project_revision_v2(uuid, text);
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

