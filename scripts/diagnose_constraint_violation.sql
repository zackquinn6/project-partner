-- ============================================
-- DIAGNOSE: Check the custom_phase_metadata_check constraint
-- ============================================
-- This script will show us what the constraint requires

-- Step 1: Get the constraint definition
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.template_operations'::regclass
  AND conname = 'custom_phase_metadata_check';

-- Step 2: Check all constraints on template_operations
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.template_operations'::regclass
ORDER BY conname;

-- Step 3: Check column defaults for template_operations
SELECT 
  column_name,
  column_default,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'template_operations'
  AND column_name IN ('is_custom_phase', 'is_standard_phase', 'is_reference', 'custom_phase_name', 'custom_phase_description')
ORDER BY column_name;

-- Step 4: Check what values are being inserted (simulate the INSERT)
DO $$
DECLARE
  test_project_id UUID := '00000000-0000-0000-0000-000000000001';
  test_phase_id UUID;
  test_operation_id UUID;
BEGIN
  -- Create a test phase
  INSERT INTO public.project_phases (
    project_id,
    name,
    description,
    is_standard,
    position_rule,
    position_value
  ) VALUES (
    test_project_id,
    'Test Phase for Constraint Check',
    'Test',
    true,
    'last_minus_n',
    1
  )
  RETURNING id INTO test_phase_id;

  RAISE NOTICE 'Created test phase: %', test_phase_id;

  -- Try to insert an operation with minimal fields (like add_custom_project_phase does)
  BEGIN
    INSERT INTO public.template_operations (
      project_id,
      phase_id,
      name,
      description,
      flow_type
    ) VALUES (
      test_project_id,
      test_phase_id,
      'Test Operation',
      'Test description',
      'prime'
    )
    RETURNING id INTO test_operation_id;

    RAISE NOTICE '✅ INSERT succeeded. Operation ID: %', test_operation_id;
    RAISE NOTICE 'Checking what values were actually inserted...';

    -- Check what values were inserted
    SELECT 
      id,
      is_custom_phase,
      is_standard_phase,
      is_reference,
      custom_phase_name,
      custom_phase_description
    INTO 
      test_operation_id,
      test_operation_id,
      test_operation_id,
      test_operation_id,
      test_operation_id,
      test_operation_id
    FROM public.template_operations
    WHERE id = test_operation_id;

    -- Cleanup
    DELETE FROM public.template_operations WHERE id = test_operation_id;
    DELETE FROM public.project_phases WHERE id = test_phase_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ INSERT failed with error: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
    
    -- Cleanup on error
    DELETE FROM public.template_operations WHERE phase_id = test_phase_id;
    DELETE FROM public.project_phases WHERE id = test_phase_id;
    
    RAISE;
  END;
END $$;

