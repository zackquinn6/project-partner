-- Combine tool_brands, tool_categories, and tool_models into a single tools table.
-- There is no existing data, so we safely rename tool_models and drop the others.

BEGIN;

-- 1) Rename tool_models to tools (preserves existing columns and relationships)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tool_models'
  ) THEN
    ALTER TABLE public.tool_models RENAME TO tools;
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

