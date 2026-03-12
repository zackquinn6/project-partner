-- Safely drop legacy project_templates_live view now that
-- all UI and data access use the projects table directly.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'project_templates_live'
  ) THEN
    DROP VIEW public.project_templates_live CASCADE;
  END IF;
END;
$$;

COMMIT;

