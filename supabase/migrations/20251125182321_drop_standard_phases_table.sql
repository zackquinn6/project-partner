-- Drop standard_phases table and update references
-- Migration: 20251125182321_drop_standard_phases_table.sql
--
-- This migration removes the standard_phases table since all phase data
-- (including position rules) is now stored in project_phases table.

-- ============================================
-- STEP 1: Remove foreign key constraint from project_phases.standard_phase_id
-- ============================================
-- Drop the foreign key constraint that references standard_phases
ALTER TABLE public.project_phases
DROP CONSTRAINT IF EXISTS project_phases_standard_phase_id_fkey;

-- ============================================
-- STEP 2: Drop standard_phases table
-- ============================================
DROP TABLE IF EXISTS public.standard_phases CASCADE;

-- ============================================
-- STEP 3: Update comments
-- ============================================
COMMENT ON COLUMN public.project_phases.standard_phase_id IS 
'Reference to a standard phase. This is now a UUID identifier only - the standard_phases table has been removed.
Standard phases are identified by is_standard=true and are stored in project_phases table.
For Standard Project Foundation (ID: 00000000-0000-0000-0000-000000000001), standard_phase_id can be used
as a unique identifier for the phase type (Kickoff, Planning, Ordering, Close Project).';

COMMENT ON COLUMN public.project_phases.position_rule IS 
'Position rule for phase ordering. Values: "first", "last", "nth", "last_minus_n", or NULL for custom phases.
Standard phases have position rules. Custom phases typically have NULL.';

COMMENT ON COLUMN public.project_phases.position_value IS 
'Position value for "nth" and "last_minus_n" rules. 
For "nth": the position number (e.g., 2 = second position).
For "last_minus_n": offset from last (e.g., 1 = second-to-last).
NULL for "first", "last", or custom phases.';

-- ============================================
-- STEP 4: Verify migration
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  standard_phases_count INTEGER;
  phases_with_position_rules INTEGER;
BEGIN
  -- Count standard phases in Standard Project Foundation
  SELECT COUNT(*) INTO standard_phases_count
  FROM public.project_phases
  WHERE project_id = standard_project_id
    AND is_standard = true;

  -- Count phases with position rules
  SELECT COUNT(*) INTO phases_with_position_rules
  FROM public.project_phases
  WHERE project_id = standard_project_id
    AND is_standard = true
    AND position_rule IS NOT NULL;

  RAISE NOTICE '=== Migration Verification ===';
  RAISE NOTICE 'Standard phases in project_phases: %', standard_phases_count;
  RAISE NOTICE 'Phases with position rules: %', phases_with_position_rules;

  IF standard_phases_count = 0 THEN
    RAISE WARNING 'WARNING: No standard phases found in Standard Project Foundation!';
  END IF;

  IF phases_with_position_rules < standard_phases_count THEN
    RAISE WARNING 'WARNING: Some standard phases are missing position rules!';
  END IF;
END;
$$;

