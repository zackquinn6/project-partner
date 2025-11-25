-- Test script for add_custom_project_phase function
-- This script tests the function to ensure it works correctly
-- Run this in Supabase SQL Editor after applying migrations

-- ============================================
-- TEST 1: Verify function exists and has correct signature
-- ============================================
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname = 'add_custom_project_phase'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF func_count = 0 THEN
    RAISE EXCEPTION 'Function add_custom_project_phase does not exist';
  END IF;

  RAISE NOTICE '✅ TEST 1 PASSED: Function exists';
END $$;

-- ============================================
-- TEST 2: Verify function source doesn't contain display_order
-- ============================================
DO $$
DECLARE
  func_source TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO func_source
  FROM pg_proc
  WHERE proname = 'add_custom_project_phase'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LIMIT 1;

  IF func_source ILIKE '%display_order%' THEN
    RAISE EXCEPTION 'Function contains display_order reference';
  END IF;

  RAISE NOTICE '✅ TEST 2 PASSED: Function does not reference display_order';
END $$;

-- ============================================
-- TEST 3: Test adding phase to Standard Project Foundation
-- ============================================
DO $$
DECLARE
  v_standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  v_test_phase_name TEXT := 'TEST_PHASE_' || extract(epoch from now())::text;
  v_result RECORD;
  v_phase_count_before INTEGER;
  v_phase_count_after INTEGER;
  v_operation_count INTEGER;
  v_step_count INTEGER;
BEGIN
  -- Count phases before
  SELECT COUNT(*) INTO v_phase_count_before
  FROM project_phases
  WHERE project_id = v_standard_project_id;

  -- Call the function
  SELECT * INTO v_result
  FROM add_custom_project_phase(
    v_standard_project_id,
    v_test_phase_name,
    'Test phase description'
  );

  -- Verify result
  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Function returned NULL id';
  END IF;

  IF v_result.name != v_test_phase_name THEN
    RAISE EXCEPTION 'Function returned incorrect phase name. Expected: %, Got: %', v_test_phase_name, v_result.name;
  END IF;

  IF v_result.position_rule != 'last_minus_n' THEN
    RAISE EXCEPTION 'Function returned incorrect position_rule. Expected: last_minus_n, Got: %', v_result.position_rule;
  END IF;

  IF v_result.position_value != 1 THEN
    RAISE EXCEPTION 'Function returned incorrect position_value. Expected: 1, Got: %', v_result.position_value;
  END IF;

  IF v_result.is_standard != true THEN
    RAISE EXCEPTION 'Function returned incorrect is_standard. Expected: true, Got: %', v_result.is_standard;
  END IF;

  -- Count phases after
  SELECT COUNT(*) INTO v_phase_count_after
  FROM project_phases
  WHERE project_id = v_standard_project_id;

  IF v_phase_count_after != v_phase_count_before + 1 THEN
    RAISE EXCEPTION 'Phase count did not increase. Before: %, After: %', v_phase_count_before, v_phase_count_after;
  END IF;

  -- Verify operation was created
  SELECT COUNT(*) INTO v_operation_count
  FROM template_operations
  WHERE phase_id = v_result.id;

  IF v_operation_count != 1 THEN
    RAISE EXCEPTION 'Expected 1 operation, found: %', v_operation_count;
  END IF;

  -- Verify step was created
  SELECT COUNT(*) INTO v_step_count
  FROM template_steps
  WHERE operation_id IN (
    SELECT id FROM template_operations WHERE phase_id = v_result.id
  );

  IF v_step_count != 1 THEN
    RAISE EXCEPTION 'Expected 1 step, found: %', v_step_count;
  END IF;

  -- Clean up test data
  DELETE FROM template_steps
  WHERE operation_id IN (
    SELECT id FROM template_operations WHERE phase_id = v_result.id
  );

  DELETE FROM template_operations
  WHERE phase_id = v_result.id;

  DELETE FROM project_phases
  WHERE id = v_result.id;

  RAISE NOTICE '✅ TEST 3 PASSED: Function correctly adds phase with operation and step to Standard Project Foundation';
  RAISE NOTICE '   - Phase ID: %', v_result.id;
  RAISE NOTICE '   - Position Rule: %', v_result.position_rule;
  RAISE NOTICE '   - Position Value: %', v_result.position_value;
  RAISE NOTICE '   - Operations created: %', v_operation_count;
  RAISE NOTICE '   - Steps created: %', v_step_count;
END $$;

-- ============================================
-- TEST 4: Test adding phase to regular project
-- ============================================
DO $$
DECLARE
  v_test_project_id UUID;
  v_test_phase_name TEXT := 'TEST_PHASE_REGULAR_' || extract(epoch from now())::text;
  v_result RECORD;
  v_operation_count INTEGER;
  v_step_count INTEGER;
BEGIN
  -- Create a test project
  INSERT INTO projects (name, description, category, publish_status, created_by, is_current_version)
  VALUES ('TEST_PROJECT_' || extract(epoch from now())::text, 'Test project', 'general', 'draft', auth.uid(), true)
  RETURNING id INTO v_test_project_id;

  -- Call the function
  SELECT * INTO v_result
  FROM add_custom_project_phase(
    v_test_project_id,
    v_test_phase_name,
    'Test phase description'
  );

  -- Verify result
  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Function returned NULL id';
  END IF;

  IF v_result.position_rule IS NOT NULL THEN
    RAISE EXCEPTION 'Function returned non-NULL position_rule for regular project. Got: %', v_result.position_rule;
  END IF;

  IF v_result.is_standard != false THEN
    RAISE EXCEPTION 'Function returned incorrect is_standard. Expected: false, Got: %', v_result.is_standard;
  END IF;

  -- Verify operation and step were created
  SELECT COUNT(*) INTO v_operation_count
  FROM template_operations
  WHERE phase_id = v_result.id;

  SELECT COUNT(*) INTO v_step_count
  FROM template_steps
  WHERE operation_id IN (
    SELECT id FROM template_operations WHERE phase_id = v_result.id
  );

  IF v_operation_count != 1 OR v_step_count != 1 THEN
    RAISE EXCEPTION 'Expected 1 operation and 1 step, found % operations and % steps', v_operation_count, v_step_count;
  END IF;

  -- Clean up test data
  DELETE FROM template_steps
  WHERE operation_id IN (
    SELECT id FROM template_operations WHERE phase_id = v_result.id
  );

  DELETE FROM template_operations
  WHERE phase_id = v_result.id;

  DELETE FROM project_phases
  WHERE id = v_result.id;

  DELETE FROM projects
  WHERE id = v_test_project_id;

  RAISE NOTICE '✅ TEST 4 PASSED: Function correctly adds phase with operation and step to regular project';
END $$;

-- ============================================
-- TEST 5: Verify no display_order column exists
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'project_phases' 
      AND column_name = 'display_order'
  ) THEN
    RAISE EXCEPTION 'display_order column still exists in project_phases';
  END IF;

  RAISE NOTICE '✅ TEST 5 PASSED: display_order column does not exist in project_phases';
END $$;

-- ============================================
-- ALL TESTS COMPLETE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL TESTS PASSED';
  RAISE NOTICE 'The add_custom_project_phase function is working correctly!';
  RAISE NOTICE '========================================';
END $$;

