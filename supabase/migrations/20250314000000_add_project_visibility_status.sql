-- Add per-revision visibility status for projects
-- and migrate any existing 'coming-soon' publish_status
-- into visibility_status.

BEGIN;

-- 1) Add visibility_status column to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS visibility_status text NOT NULL DEFAULT 'default';

-- 2) Add / replace CHECK constraint to restrict visibility_status values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage c
    JOIN information_schema.table_constraints tc
      ON c.constraint_name = tc.constraint_name
     AND c.constraint_schema = tc.constraint_schema
    WHERE c.table_name = 'projects'
      AND c.column_name = 'visibility_status'
      AND tc.constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE projects
      DROP CONSTRAINT IF EXISTS projects_visibility_status_check;
  END IF;

  ALTER TABLE projects
    ADD CONSTRAINT projects_visibility_status_check
    CHECK (visibility_status IN ('default','coming-soon','hidden'));
END;
$$;

-- 3) Migrate any rows with publish_status = 'coming-soon'
--    to use visibility_status = 'coming-soon' and publish_status = 'draft'.
UPDATE projects
SET
  visibility_status = 'coming-soon',
  publish_status = 'draft'
WHERE publish_status = 'coming-soon';

-- 4) Tighten publish_status CHECK constraint to no longer allow 'coming-soon'
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
      CHECK (publish_status IN ('draft','beta-testing','published','archived'));
  END IF;
END;
$$;

COMMIT;

