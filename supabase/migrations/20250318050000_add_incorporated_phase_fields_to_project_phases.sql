-- Add incorporated phase fields to project_phases
-- Root cause: frontend and generated types expect these columns:
--   - is_linked boolean
--   - source_project_id uuid (FK to projects.id)
--   - source_project_name text
-- but the table in the database is missing them, causing 42703 on REST queries.

-- 1. Ensure base columns exist
ALTER TABLE public.project_phases
  ADD COLUMN IF NOT EXISTS is_linked boolean,
  ADD COLUMN IF NOT EXISTS source_project_id uuid,
  ADD COLUMN IF NOT EXISTS source_project_name text;

-- 2. Ensure foreign key from source_project_id → projects.id
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

