-- Combine tool_brands, tool_categories, and tool_models into a single tools table.
-- There is no existing data, so we safely rename tool_models and drop the others.

BEGIN;

DO $$
BEGIN
  -- If tool_models exists and tools does not, rename.
  -- If both exist, we assume tool_models is legacy/empty and drop it.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tool_models'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'tools'
    ) THEN
      ALTER TABLE public.tool_models RENAME TO tools;
    ELSE
      DROP TABLE public.tool_models CASCADE;
    END IF;
  END IF;
END;
$$;

-- 2) Drop brand/category lookup tables (and any FK constraints) if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tool_brands'
  ) THEN
    DROP TABLE public.tool_brands CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tool_categories'
  ) THEN
    DROP TABLE public.tool_categories CASCADE;
  END IF;
END;
$$;

COMMIT;

