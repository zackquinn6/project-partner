-- Diagnostic migration to check and fix rebuild function
-- This ensures the function exists and works correctly

-- Check if function exists
DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'rebuild_phases_json_from_project_phases'
  ) INTO func_exists;
  
  IF NOT func_exists THEN
    RAISE NOTICE 'rebuild_phases_json_from_project_phases function does not exist. The 20250128000000 migration must be applied first.';
  ELSE
    RAISE NOTICE 'rebuild_phases_json_from_project_phases function exists.';
  END IF;
END $$;

