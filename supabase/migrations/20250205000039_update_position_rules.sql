-- =====================================================
-- UPDATE POSITION RULES FOR PHASES
-- Remove 'first' and 'last_minus_n', keep only 'nth' and 'last'
-- =====================================================

-- Step 1: Update existing phases with 'first' rule to 'nth' with position_value = 1
UPDATE public.project_phases
SET position_rule = 'nth',
    position_value = 1
WHERE position_rule = 'first';

-- Step 2: Update existing phases with 'last_minus_n' rule to 'nth' with calculated position
-- For last_minus_n, we need to calculate the position based on total phases
-- This is a simplified approach - we'll set it to a high number and let the application calculate it
-- Actually, we can't calculate it here without knowing total phases, so we'll update to 'nth' with a placeholder
-- The application code should handle calculating the actual position
UPDATE public.project_phases
SET position_rule = 'nth',
    position_value = NULL  -- Will be calculated by application code based on total phases
WHERE position_rule = 'last_minus_n';

-- Step 3: Update the CHECK constraint on project_phases table
ALTER TABLE public.project_phases
DROP CONSTRAINT IF EXISTS project_phases_position_rule_check;

ALTER TABLE public.project_phases
ADD CONSTRAINT project_phases_position_rule_check 
CHECK (position_rule IN ('nth', 'last'));

-- Step 4: Update standard_phases table if it exists
DO $$
BEGIN
  -- Check if standard_phases table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'standard_phases') THEN
    -- Update 'first' to 'nth' with position_value = 1
    UPDATE public.standard_phases
    SET position_rule = 'nth',
        position_value = 1
    WHERE position_rule = 'first';
    
    -- Update 'last_minus_n' to 'nth' (position will be calculated by application)
    UPDATE public.standard_phases
    SET position_rule = 'nth',
        position_value = NULL
    WHERE position_rule = 'last_minus_n';
    
    -- Update CHECK constraint if it exists
    ALTER TABLE public.standard_phases
    DROP CONSTRAINT IF EXISTS standard_phases_position_rule_check;
    
    ALTER TABLE public.standard_phases
    ADD CONSTRAINT standard_phases_position_rule_check 
    CHECK (position_rule IN ('nth', 'last'));
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Updated position rules: removed first and last_minus_n, kept nth and last';
  RAISE NOTICE '✅ Updated existing phases: first -> nth with position_value=1, last_minus_n -> nth';
END $$;

