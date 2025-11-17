-- VERIFY AND FIX: Check what's actually in the database and fix it
-- This script will show us the actual function definition and fix any issues

-- ============================================
-- STEP 1: Show current function definition
-- ============================================
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_project_with_standard_foundation_v2';

-- ============================================
-- STEP 2: Check for any constraints or defaults on template_operations
-- ============================================
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.template_operations'::regclass
  AND pg_get_constraintdef(oid) LIKE '%standard_phase_id%';

-- ============================================
-- STEP 3: Check for generated columns
-- ============================================
SELECT 
  column_name,
  column_default,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'template_operations'
  AND (column_default LIKE '%standard_phase_id%' 
       OR generation_expression LIKE '%standard_phase_id%');

-- ============================================
-- STEP 4: Drop ALL triggers (including any we might have missed)
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
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON template_operations', r.trigger_name);
    RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
  END LOOP;
END;
$$;

-- ============================================
-- STEP 5: Completely recreate the function with explicit columns
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
    p_category,
    'draft',
    p_created_by,
    true
  ) RETURNING id INTO new_project_id;

  FOR std_phase IN
    SELECT 
      pp.id,
      pp.project_id,
      pp.name,
      pp.description,
      pp.display_order,
      pp.is_standard,
      pp.standard_phase_id,
      sp.id AS standard_phase_lookup
    FROM public.project_phases pp
    JOIN public.standard_phases sp ON pp.standard_phase_id = sp.id
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

    -- CRITICAL: Use EXPLICIT column list - NO SELECT * or op.*
    -- List every column we need explicitly
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

  -- Rebuild phases JSON (this function should also be fixed)
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(new_project_id)
  WHERE id = new_project_id;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Ensure rebuild_phases_json_from_project_phases is also fixed
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
-- STEP 7: Recreate only essential triggers (after function is fixed)
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
-- STEP 8: Final verification
-- ============================================
DO $$
DECLARE
  trigger_count INTEGER;
  column_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'template_operations'
    AND event_object_schema = 'public';
  
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'template_operations'
      AND column_name = 'standard_phase_id'
  ) INTO column_exists;
  
  RAISE NOTICE 'Verification: triggers=%, column_exists=%', trigger_count, column_exists;
  
  IF column_exists THEN
    RAISE EXCEPTION 'ERROR: standard_phase_id column still exists!';
  ELSE
    RAISE NOTICE 'SUCCESS: Function fixed with explicit column lists. Column does not exist.';
  END IF;
END;
$$;

