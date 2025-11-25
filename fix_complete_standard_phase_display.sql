-- Complete Fix: Ensure Standard Phases Show in Project Templates
-- This script creates the missing get_project_workflow_with_standards function
-- and verifies that rebuild_phases_json_from_project_phases includes all phases

-- ============================================
-- STEP 1: Create get_project_workflow_with_standards function
-- ============================================
CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(
  p_project_id UUID
)
RETURNS JSONB AS $$
DECLARE
  workflow_json JSONB;
BEGIN
  -- Use rebuild_phases_json_from_project_phases to get the complete workflow
  -- This function already handles:
  -- 1. Getting all phases (standard and custom) from project_phases table
  -- 2. Getting all operations for each phase
  -- 3. For standard operations with source_operation_id, pulling steps from Standard Project Foundation
  -- 4. Building the complete phases JSON with all content
  
  SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
  INTO workflow_json;
  
  -- Return the workflow JSON
  RETURN COALESCE(workflow_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: Verify rebuild_phases_json_from_project_phases includes ALL phases
-- ============================================
-- The function should select ALL phases from project_phases table
-- Let's verify it's working correctly by checking a test project

DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  test_project_id UUID;
  phases_count INTEGER;
  phases_json JSONB;
  phases_in_json INTEGER;
BEGIN
  -- Find a template project to test
  SELECT id INTO test_project_id
  FROM projects
  WHERE id != standard_project_id
    AND is_standard_template = false
    AND is_current_version = true
  LIMIT 1;
  
  IF test_project_id IS NULL THEN
    RAISE NOTICE 'No template projects found for testing';
    RETURN;
  END IF;
  
  -- Count phases in database
  SELECT COUNT(*) INTO phases_count
  FROM project_phases
  WHERE project_id = test_project_id;
  
  -- Get phases JSON
  SELECT public.rebuild_phases_json_from_project_phases(test_project_id)
  INTO phases_json;
  
  -- Count phases in JSON
  phases_in_json := jsonb_array_length(phases_json);
  
  RAISE NOTICE '=== Phase Count Verification ===';
  RAISE NOTICE 'Test project ID: %', test_project_id;
  RAISE NOTICE 'Phases in database: %', phases_count;
  RAISE NOTICE 'Phases in JSON: %', phases_in_json;
  
  IF phases_count != phases_in_json THEN
    RAISE WARNING 'MISMATCH: Database has % phases but JSON has % phases!', phases_count, phases_in_json;
  ELSE
    RAISE NOTICE 'SUCCESS: Phase counts match!';
  END IF;
  
  -- Check if standard phases are included
  IF phases_json IS NOT NULL AND jsonb_array_length(phases_json) > 0 THEN
    RAISE NOTICE 'First phase name: %', phases_json->0->>'name';
    RAISE NOTICE 'First phase isStandard: %', phases_json->0->>'isStandard';
  END IF;
END;
$$;

-- ============================================
-- STEP 3: Test get_project_workflow_with_standards function
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  test_project_id UUID;
  workflow_json JSONB;
  phases_count INTEGER;
BEGIN
  -- Find a template project to test
  SELECT id INTO test_project_id
  FROM projects
  WHERE id != standard_project_id
    AND is_standard_template = false
    AND is_current_version = true
  LIMIT 1;
  
  IF test_project_id IS NULL THEN
    RAISE NOTICE 'No template projects found for testing';
    RETURN;
  END IF;
  
  -- Call the function
  SELECT public.get_project_workflow_with_standards(test_project_id)
  INTO workflow_json;
  
  phases_count := jsonb_array_length(workflow_json);
  
  RAISE NOTICE '=== get_project_workflow_with_standards Test ===';
  RAISE NOTICE 'Test project ID: %', test_project_id;
  RAISE NOTICE 'Phases returned: %', phases_count;
  
  IF phases_count = 0 THEN
    RAISE WARNING 'WARNING: Function returned 0 phases!';
  ELSE
    RAISE NOTICE 'SUCCESS: Function returned % phases', phases_count;
    
    -- Show first few phase names
    FOR i IN 0..LEAST(phases_count - 1, 3) LOOP
      RAISE NOTICE 'Phase %: % (isStandard: %)', 
        i + 1, 
        workflow_json->i->>'name',
        workflow_json->i->>'isStandard';
    END LOOP;
  END IF;
END;
$$;

-- ============================================
-- STEP 4: Summary
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== Fix Complete ===';
  RAISE NOTICE 'Created get_project_workflow_with_standards function';
  RAISE NOTICE 'This function uses rebuild_phases_json_from_project_phases to return all phases';
  RAISE NOTICE 'Standard phases should now appear in project templates';
END;
$$;

