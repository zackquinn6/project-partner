-- Migration: Replace 'first' position_rule with 'nth' at position_value = 1
-- This simplifies the position system to only have 'nth' and 'last' rules
-- Run this in Supabase SQL Editor

BEGIN;

-- Step 1: Update all phases with position_rule = 'first' to 'nth' with position_value = 1
UPDATE project_phases
SET 
  position_rule = 'nth',
  position_value = 1,
  updated_at = now()
WHERE position_rule = 'first';

-- Step 2: Update the fix_project_workflow_standard_phases.sql logic references
-- (This is handled in the application code, but documenting here for reference)
-- The CASE statement that checks for 'first' should now check for 'nth' with position_value = 1

-- Step 3: Verify the migration
-- Check that no 'first' rules remain
DO $$
DECLARE
  first_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO first_count
  FROM project_phases
  WHERE position_rule = 'first';
  
  IF first_count > 0 THEN
    RAISE EXCEPTION 'Migration incomplete: % phases still have position_rule = ''first''', first_count;
  ELSE
    RAISE NOTICE 'Migration successful: All ''first'' position rules converted to ''nth'' with position_value = 1';
  END IF;
END $$;

-- Step 4: Show summary
SELECT 
  position_rule,
  COUNT(*) as phase_count,
  MIN(position_value) as min_position,
  MAX(position_value) as max_position
FROM project_phases
GROUP BY position_rule
ORDER BY position_rule;

COMMIT;

