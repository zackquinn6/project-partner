-- COMPLETE FIX: Create Project Function - Remove ALL standard_phase_id references
-- This script ensures the function works correctly and all triggers are safe

-- ============================================
-- STEP 1: Drop ALL versions of the function (handle all possible signatures)
-- ============================================
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Drop all function signatures
  FOR func_record IN
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project_with_standard_foundation_v2'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
      func_record.proname, 
      func_record.args);
    RAISE NOTICE 'Dropped function: %(%)', func_record.proname, func_record.args;
  END LOOP;
END;
$$;

-- ============================================
-- STEP 2: Drop ALL triggers on template_operations
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'template_operations'
      AND event_object_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON template_operations CASCADE', r.trigger_name);
    RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
  END LOOP;
END;
$$;

-- ============================================
-- STEP 3: Create the CORRECT function with explicit columns
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
BEGIN
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
    COALESCE(p_category, 'general'),
    'draft',
    p_created_by,
    true
  ) RETURNING id INTO new_project_id;

  -- Copy phases from standard project
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
      std_phase.standard_phase_id
    ) RETURNING id INTO new_phase_id;

    -- Copy operations for this phase
    -- CRITICAL: Use EXPLICIT column list - NO SELECT * or op.*
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
        op.is_reference,
        op.created_at,
        op.updated_at
      FROM public.template_operations op
      WHERE op.project_id = standard_project_id
        AND op.phase_id = std_phase.id
      ORDER BY op.display_order
    LOOP
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
        std_operation.id,
        true
      );
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
-- STEP 4: Ensure rebuild_phases_json_from_project_phases is correct
-- ============================================
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  phases_json JSONB := '[]'::jsonb;
  phase_record RECORD;
  operations_json JSONB;
  operation_record RECORD;
  effective_operation_id UUID;
  steps_json JSONB;
BEGIN
  FOR phase_record IN
    SELECT 
      id,
      project_id,
      name,
      description,
      display_order,
      is_standard,
      standard_phase_id
    FROM public.project_phases
    WHERE project_id = p_project_id
    ORDER BY display_order
  LOOP
    operations_json := '[]'::jsonb;

    -- CRITICAL: Use EXPLICIT column list - NO op.*
    FOR operation_record IN
      SELECT DISTINCT
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
        op.is_reference,
        src.name AS source_name,
        src.description AS source_description,
        src.flow_type AS source_flow_type,
        src.user_prompt AS source_user_prompt,
        src.alternate_group AS source_alternate_group
      FROM public.template_operations op
      LEFT JOIN public.template_operations src ON op.source_operation_id = src.id
      WHERE op.project_id = p_project_id
        AND op.phase_id = phase_record.id
      ORDER BY op.display_order
    LOOP
      effective_operation_id := COALESCE(operation_record.source_operation_id, operation_record.id);

      steps_json := public.get_operation_steps_json(
        effective_operation_id,
        COALESCE(operation_record.is_reference, false)
      );

      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', operation_record.id,
          'name', COALESCE(operation_record.name, operation_record.source_name),
          'description', COALESCE(operation_record.description, operation_record.source_description),
          'flowType', COALESCE(operation_record.flow_type, operation_record.source_flow_type, 'prime'),
          'userPrompt', COALESCE(operation_record.user_prompt, operation_record.source_user_prompt),
          'alternateGroup', COALESCE(operation_record.alternate_group, operation_record.source_alternate_group),
          'steps', COALESCE(steps_json, '[]'::jsonb),
          'isStandard', COALESCE(operation_record.is_reference, false) OR phase_record.is_standard,
          'sourceOperationId', operation_record.source_operation_id
        )
      );
    END LOOP;

    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', phase_record.is_standard
      )
    );
  END LOOP;

  RETURN phases_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 5: Recreate ONLY essential, safe triggers
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_operation_is_standard_on_insert_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phase_id IS NOT NULL THEN
    SELECT COALESCE(is_standard, false) INTO NEW.is_standard_phase
    FROM public.project_phases
    WHERE id = NEW.phase_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_operation_is_standard_on_insert_update_trigger
  BEFORE INSERT OR UPDATE OF phase_id ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION sync_operation_is_standard_on_insert_update();

CREATE TRIGGER update_template_operations_updated_at
  BEFORE UPDATE ON template_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: Verify function exists and is correct
-- ============================================
DO $$
DECLARE
  func_count INTEGER;
  func_def TEXT;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'create_project_with_standard_foundation_v2';
  
  RAISE NOTICE 'Function count: % (should be 1)', func_count;
  
  IF func_count = 0 THEN
    RAISE EXCEPTION 'ERROR: Function does not exist!';
  ELSIF func_count > 1 THEN
    RAISE EXCEPTION 'ERROR: Multiple versions of function still exist!';
  ELSE
    -- Get function definition to verify it doesn't reference standard_phase_id in template_operations
    SELECT pg_get_functiondef(p.oid) INTO func_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project_with_standard_foundation_v2'
    LIMIT 1;
    
    IF func_def LIKE '%template_operations%standard_phase_id%' OR 
       func_def LIKE '%op.standard_phase_id%' OR
       func_def LIKE '%NEW.standard_phase_id%' OR
       func_def LIKE '%OLD.standard_phase_id%' THEN
      RAISE EXCEPTION 'ERROR: Function still references standard_phase_id in template_operations!';
    ELSE
      RAISE NOTICE 'SUCCESS: Function exists and does not reference standard_phase_id in template_operations';
    END IF;
  END IF;
END;
$$;

-- ============================================
-- STEP 7: Verify no triggers reference standard_phase_id
-- ============================================
DO $$
DECLARE
  trigger_count INTEGER;
  trigger_record RECORD;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'template_operations'
    AND event_object_schema = 'public';
  
  RAISE NOTICE 'Trigger count on template_operations: %', trigger_count;
  
  -- Check each trigger function for standard_phase_id references
  FOR trigger_record IN
    SELECT 
      t.trigger_name,
      p.proname AS function_name
    FROM information_schema.triggers t
    JOIN pg_trigger pt ON pt.tgname = t.trigger_name
    JOIN pg_proc p ON p.oid = pt.tgfoid
    WHERE t.event_object_table = 'template_operations'
      AND t.event_object_schema = 'public'
  LOOP
    DECLARE
      func_def TEXT;
    BEGIN
      SELECT pg_get_functiondef(p.oid) INTO func_def
      FROM pg_proc p
      WHERE p.proname = trigger_record.function_name
      LIMIT 1;
      
      IF func_def LIKE '%template_operations%standard_phase_id%' OR
         func_def LIKE '%NEW.standard_phase_id%' OR
         func_def LIKE '%OLD.standard_phase_id%' THEN
        RAISE WARNING 'Trigger % uses function % that references standard_phase_id', 
          trigger_record.trigger_name, trigger_record.function_name;
      END IF;
    END;
  END LOOP;
  
  RAISE NOTICE 'Trigger verification complete';
END;
$$;

