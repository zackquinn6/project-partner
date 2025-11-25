-- Add position_rule and position_value to project_phases table
-- Migration: 20251125181957_add_position_rules_to_project_phases.sql
--
-- This migration adds position rules to project_phases so that both standard
-- and custom phases can use position rules for ordering.

-- ============================================
-- STEP 1: Add position_rule and position_value columns
-- ============================================
ALTER TABLE public.project_phases
ADD COLUMN IF NOT EXISTS position_rule TEXT,
ADD COLUMN IF NOT EXISTS position_value INTEGER;

-- ============================================
-- STEP 2: Copy position rules from standard_phases to project_phases
-- ============================================
-- For standard phases in Standard Project Foundation, copy position rules
UPDATE public.project_phases pp
SET 
  position_rule = sp.position_rule,
  position_value = sp.position_value
FROM public.standard_phases sp
WHERE pp.standard_phase_id = sp.id
  AND pp.is_standard = true
  AND pp.position_rule IS NULL;

-- ============================================
-- STEP 3: Set default position rules for custom phases
-- ============================================
-- Custom phases (without standard_phase_id) should have NULL position rules
-- This allows them to be positioned flexibly between standard phases
-- The UI will handle positioning based on display_order for custom phases
UPDATE public.project_phases
SET 
  position_rule = NULL,
  position_value = NULL
WHERE standard_phase_id IS NULL
  AND position_rule IS NULL;

-- ============================================
-- STEP 4: Add comments
-- ============================================
COMMENT ON COLUMN public.project_phases.position_rule IS 
'Position rule for phase ordering. Values: "first", "last", "nth", "last_minus_n", or NULL for custom phases.
Standard phases use rules from standard_phases table. Custom phases typically have NULL.';

COMMENT ON COLUMN public.project_phases.position_value IS 
'Position value for "nth" and "last_minus_n" rules. 
For "nth": the position number (e.g., 2 = second position).
For "last_minus_n": offset from last (e.g., 1 = second-to-last).
NULL for "first", "last", or custom phases.';

-- ============================================
-- STEP 5: Verify the migration
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  phases_with_rules INTEGER;
  phases_without_rules INTEGER;
BEGIN
  -- Count standard phases with position rules
  SELECT COUNT(*) INTO phases_with_rules
  FROM public.project_phases pp
  JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
  WHERE pp.project_id = standard_project_id
    AND pp.is_standard = true
    AND pp.position_rule IS NOT NULL;

  -- Count phases without rules (should only be custom phases)
  SELECT COUNT(*) INTO phases_without_rules
  FROM public.project_phases
  WHERE position_rule IS NULL
    AND standard_phase_id IS NOT NULL;

  RAISE NOTICE '=== Migration Verification ===';
  RAISE NOTICE 'Standard phases with position rules: %', phases_with_rules;
  RAISE NOTICE 'Phases without rules (should be 0 for standard phases): %', phases_without_rules;

  IF phases_without_rules > 0 THEN
    RAISE WARNING 'WARNING: % standard phases are missing position rules!', phases_without_rules;
  END IF;
END;
$$;

