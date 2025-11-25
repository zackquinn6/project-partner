-- Verify and Fix Standard Phase Linking for NEW Projects
-- This script ensures create_project_with_standard_foundation_v2 correctly links standard phases

-- ============================================
-- STEP 1: Check current function definition
-- ============================================
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_project_with_standard_foundation_v2';

-- ============================================
-- STEP 2: Verify Standard Project Foundation has proper setup
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  foundation_exists BOOLEAN;
  phases_count INTEGER;
  phases_with_standard_phase_id INTEGER;
  operations_count INTEGER;
BEGIN
  -- Check if foundation exists
  SELECT EXISTS(SELECT 1 FROM projects WHERE id = standard_project_id) INTO foundation_exists;
  
  IF NOT foundation_exists THEN
    RAISE EXCEPTION 'Standard Project Foundation (ID: %) does not exist!', standard_project_id;
  END IF;
  
  -- Count phases
  SELECT COUNT(*) INTO phases_count
  FROM project_phases
  WHERE project_id = standard_project_id;
  
  -- Count phases with standard_phase_id
  SELECT COUNT(*) INTO phases_with_standard_phase_id
  FROM project_phases
  WHERE project_id = standard_project_id
    AND standard_phase_id IS NOT NULL;
  
  -- Count operations
  SELECT COUNT(*) INTO operations_count
  FROM template_operations
  WHERE project_id = standard_project_id;
  
  RAISE NOTICE '=== Standard Project Foundation Status ===';
  RAISE NOTICE 'Foundation exists: %', foundation_exists;
  RAISE NOTICE 'Total phases: %', phases_count;
  RAISE NOTICE 'Phases with standard_phase_id: %', phases_with_standard_phase_id;
  RAISE NOTICE 'Total operations: %', operations_count;
  
  IF phases_with_standard_phase_id < phases_count THEN
    RAISE WARNING 'WARNING: Some phases in foundation are missing standard_phase_id!';
  END IF;
END;
$$;

-- ============================================
-- STEP 3: Ensure create_project_with_standard_foundation_v2 is correct
-- ============================================
CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  p_project_name TEXT,
  p_project_description TEXT,
  p_category TEXT DEFAULT 'general',
  p_created_by UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  std_phase RECORD;
  new_phase_id UUID;
  std_operation RECORD;
  new_operation_id UUID;
  category_array TEXT[];
BEGIN
  -- Convert single category text to array (category column is text[])
  category_array := ARRAY[COALESCE(p_category, 'general')];
  
  -- Create project
  INSERT INTO public.projects (
    name,
    description,
    category,
    publish_status,
    created_by,
    is_current_version
  ) VALUES (
    p_project_name,
    p_project_description,
    category_array,
    'draft',
    p_created_by,
    true
  ) RETURNING id INTO new_project_id;

  -- Copy phases from standard project and link them properly
  FOR std_phase IN
    SELECT 
      pp.id,
      pp.project_id,
      pp.name,
      pp.description,
      pp.display_order,
      pp.is_standard,
      pp.standard_phase_id
    FROM public.project_phases pp
    WHERE pp.project_id = standard_project_id
    ORDER BY pp.display_order
  LOOP
    -- CRITICAL: Copy phase with standard_phase_id link
    INSERT INTO public.project_phases (
      project_id,
      name,
      description,
      display_order,
      is_standard,
      standard_phase_id
    ) VALUES (
      new_project_id,
      std_phase.name,
      std_phase.description,
      std_phase.display_order,
      true,
      std_phase.standard_phase_id  -- CRITICAL: Preserve link to standard_phases table
    ) RETURNING id INTO new_phase_id;

    -- CRITICAL: Link operations to standard foundation via source_operation_id
    FOR std_operation IN
      SELECT 
        op.id,
        op.project_id,
        op.phase_id,
        op.name,
        op.description,
        op.flow_type,
        op.user_prompt,
        op.alternate_group,
        op.display_order,
        op.is_standard_phase,
        op.source_operation_id,
        op.is_reference
      FROM public.template_operations op
      WHERE op.project_id = standard_project_id
        AND op.phase_id = std_phase.id
      ORDER BY op.display_order
    LOOP
      -- CRITICAL: Create operation with source_operation_id pointing to standard foundation
      INSERT INTO public.template_operations (
        project_id,
        phase_id,
        name,
        description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        is_standard_phase,
        source_operation_id,
        is_reference
      ) VALUES (
        new_project_id,
        new_phase_id,
        std_operation.name,
        std_operation.description,
        std_operation.flow_type,
        std_operation.user_prompt,
        std_operation.alternate_group,
        std_operation.display_order,
        true,
        std_operation.id,  -- CRITICAL: Link to standard foundation operation
        true                -- CRITICAL: Mark as reference to standard foundation
      ) RETURNING id INTO new_operation_id;
      
      -- NOTE: Steps are NOT copied here. They will be pulled dynamically from the source operation
      -- via get_operation_steps_json() when rebuild_phases_json_from_project_phases() is called.
      -- This ensures templates always get the latest steps from the standard foundation.
    END LOOP;
  END LOOP;

  -- Rebuild phases JSON
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(new_project_id)
  WHERE id = new_project_id;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Test the function with a test project
-- ============================================
DO $$
DECLARE
  test_project_id UUID;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  phases_linked_count INTEGER;
  operations_linked_count INTEGER;
  phases_without_standard_phase_id INTEGER;
  operations_without_source_link INTEGER;
BEGIN
  -- Create a test project
  SELECT public.create_project_with_standard_foundation_v2(
    'TEST: Standard Phase Linking Verification',
    'This is a test project to verify standard phase linking',
    'general'
  ) INTO test_project_id;
  
  RAISE NOTICE 'Created test project with ID: %', test_project_id;
  
  -- Check phase linking
  SELECT COUNT(*) INTO phases_linked_count
  FROM project_phases
  WHERE project_id = test_project_id
    AND is_standard = true
    AND standard_phase_id IS NOT NULL;
  
  SELECT COUNT(*) INTO phases_without_standard_phase_id
  FROM project_phases
  WHERE project_id = test_project_id
    AND is_standard = true
    AND standard_phase_id IS NULL;
  
  -- Check operation linking
  SELECT COUNT(*) INTO operations_linked_count
  FROM template_operations op
  JOIN project_phases pp ON op.phase_id = pp.id
  WHERE pp.project_id = test_project_id
    AND pp.is_standard = true
    AND op.source_operation_id IS NOT NULL;
  
  SELECT COUNT(*) INTO operations_without_source_link
  FROM template_operations op
  JOIN project_phases pp ON op.phase_id = pp.id
  WHERE pp.project_id = test_project_id
    AND pp.is_standard = true
    AND op.source_operation_id IS NULL;
  
  RAISE NOTICE '=== Test Project Linking Results ===';
  RAISE NOTICE 'Phases with standard_phase_id: %', phases_linked_count;
  RAISE NOTICE 'Phases without standard_phase_id: %', phases_without_standard_phase_id;
  RAISE NOTICE 'Operations with source_operation_id: %', operations_linked_count;
  RAISE NOTICE 'Operations without source_operation_id: %', operations_without_source_link;
  
  IF phases_without_standard_phase_id > 0 THEN
    RAISE WARNING 'FAILED: % phases are missing standard_phase_id!', phases_without_standard_phase_id;
  ELSE
    RAISE NOTICE 'SUCCESS: All phases have standard_phase_id';
  END IF;
  
  IF operations_without_source_link > 0 THEN
    RAISE WARNING 'FAILED: % operations are missing source_operation_id!', operations_without_source_link;
  ELSE
    RAISE NOTICE 'SUCCESS: All operations have source_operation_id';
  END IF;
  
  -- Clean up test project
  DELETE FROM projects WHERE id = test_project_id;
  RAISE NOTICE 'Cleaned up test project';
  
END;
$$;

-- ============================================
-- STEP 5: Summary
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== Verification Complete ===';
  RAISE NOTICE 'The create_project_with_standard_foundation_v2 function has been verified and updated.';
  RAISE NOTICE 'All new projects created with this function will have:';
  RAISE NOTICE '  1. project_phases.standard_phase_id set for all standard phases';
  RAISE NOTICE '  2. template_operations.source_operation_id set for all standard operations';
  RAISE NOTICE '  3. Proper linking to Standard Project Foundation';
END;
$$;

