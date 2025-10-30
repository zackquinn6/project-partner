-- Phase 4: Automated Testing Function

CREATE OR REPLACE FUNCTION test_custom_phase_revision_preservation()
RETURNS TABLE(
  test_name TEXT,
  passed BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  test_project_id uuid;
  revision_project_id uuid;
  original_phase_count int;
  revision_phase_count int;
  original_custom_ops int;
  revision_custom_ops int;
  original_phases jsonb;
  revision_phases jsonb;
BEGIN
  -- Test 1: Create project with custom phase
  test_name := 'Create project with custom phase';
  
  BEGIN
    -- Create test project via the standard foundation function
    SELECT create_project_with_standard_foundation(
      'Test Custom Phase Project',
      'Testing custom phase preservation',
      ARRAY['test']::text[],
      'beginner',
      'low',
      'beginner',
      '1-2 hours',
      NULL,
      NULL,
      NULL
    ) INTO test_project_id;
    
    -- Add a custom phase via sync
    UPDATE projects
    SET phases = phases || jsonb_build_array(
      jsonb_build_object(
        'id', 'custom_test_prep',
        'name', 'Test Prep Phase',
        'description', 'Custom preparation phase for testing',
        'isStandard', false,
        'operations', jsonb_build_array(
          jsonb_build_object(
            'id', gen_random_uuid(),
            'name', 'Prep Operation 1',
            'description', 'First prep operation',
            'steps', jsonb_build_array(
              jsonb_build_object(
                'stepNumber', 1,
                'step', 'Test Step 1',
                'description', 'Test description',
                'content_sections', '[]'::jsonb,
                'materials', '[]'::jsonb,
                'tools', '[]'::jsonb,
                'outputs', '[]'::jsonb,
                'apps', '[]'::jsonb,
                'estimatedTimeMinutes', 30
              )
            )
          )
        )
      )
    )
    WHERE id = test_project_id;
    
    -- Sync phases to templates
    PERFORM sync_phases_to_templates(test_project_id);
    
    -- Rebuild phases JSON
    UPDATE projects
    SET phases = rebuild_phases_json_from_templates(test_project_id)
    WHERE id = test_project_id;
    
    -- Count original phases and custom operations
    SELECT 
      jsonb_array_length(phases),
      phases
    INTO original_phase_count, original_phases
    FROM projects
    WHERE id = test_project_id;
    
    SELECT COUNT(*)
    INTO original_custom_ops
    FROM template_operations
    WHERE project_id = test_project_id
      AND standard_phase_id IS NULL;
    
    passed := (original_phase_count > 4 AND original_custom_ops > 0);
    details := format('Created project with %s phases, %s custom operations', 
                     original_phase_count, original_custom_ops);
    RETURN NEXT;
    
  EXCEPTION WHEN OTHERS THEN
    passed := false;
    details := 'Error: ' || SQLERRM;
    RETURN NEXT;
    RETURN;
  END;
  
  -- Test 2: Create revision and verify custom phase exists
  test_name := 'Create revision preserves custom phase';
  
  BEGIN
    -- Create revision
    SELECT create_project_revision(test_project_id, 'Test revision') 
    INTO revision_project_id;
    
    -- Count revision phases and custom operations
    SELECT 
      jsonb_array_length(phases),
      phases
    INTO revision_phase_count, revision_phases
    FROM projects
    WHERE id = revision_project_id;
    
    SELECT COUNT(*)
    INTO revision_custom_ops
    FROM template_operations
    WHERE project_id = revision_project_id
      AND standard_phase_id IS NULL;
    
    passed := (
      revision_phase_count = original_phase_count AND
      revision_custom_ops = original_custom_ops AND
      revision_phases::text LIKE '%Test Prep Phase%'
    );
    
    details := format('Revision has %s phases (expected %s), %s custom operations (expected %s)', 
                     revision_phase_count, original_phase_count,
                     revision_custom_ops, original_custom_ops);
    RETURN NEXT;
    
  EXCEPTION WHEN OTHERS THEN
    passed := false;
    details := 'Error: ' || SQLERRM;
    RETURN NEXT;
    RETURN;
  END;
  
  -- Test 3: Verify custom phase content in revision
  test_name := 'Verify custom phase content in revision';
  
  BEGIN
    DECLARE
      custom_phase_exists boolean;
      custom_operation_exists boolean;
      custom_step_exists boolean;
    BEGIN
      -- Check if custom phase exists in JSON
      SELECT EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(revision_phases) as phase
        WHERE phase->>'name' = 'Test Prep Phase'
          AND (phase->>'isStandard')::boolean = false
      ) INTO custom_phase_exists;
      
      -- Check if custom operation exists in templates
      SELECT EXISTS (
        SELECT 1
        FROM template_operations
        WHERE project_id = revision_project_id
          AND custom_phase_name = 'Test Prep Phase'
          AND standard_phase_id IS NULL
      ) INTO custom_operation_exists;
      
      -- Check if custom step exists
      SELECT EXISTS (
        SELECT 1
        FROM template_steps ts
        JOIN template_operations toper ON ts.operation_id = toper.id
        WHERE toper.project_id = revision_project_id
          AND toper.custom_phase_name = 'Test Prep Phase'
          AND ts.step_title = 'Test Step 1'
      ) INTO custom_step_exists;
      
      passed := (custom_phase_exists AND custom_operation_exists AND custom_step_exists);
      details := format('Phase exists: %s, Operation exists: %s, Step exists: %s',
                       custom_phase_exists, custom_operation_exists, custom_step_exists);
      RETURN NEXT;
    END;
    
  EXCEPTION WHEN OTHERS THEN
    passed := false;
    details := 'Error: ' || SQLERRM;
    RETURN NEXT;
    RETURN;
  END;
  
  -- Cleanup
  test_name := 'Cleanup test data';
  BEGIN
    DELETE FROM template_steps 
    WHERE operation_id IN (
      SELECT id FROM template_operations 
      WHERE project_id IN (test_project_id, revision_project_id)
    );
    
    DELETE FROM template_operations 
    WHERE project_id IN (test_project_id, revision_project_id);
    
    DELETE FROM projects 
    WHERE id IN (test_project_id, revision_project_id);
    
    passed := true;
    details := 'Test data cleaned up successfully';
    RETURN NEXT;
    
  EXCEPTION WHEN OTHERS THEN
    passed := false;
    details := 'Cleanup error: ' || SQLERRM;
    RETURN NEXT;
  END;
  
END;
$$;