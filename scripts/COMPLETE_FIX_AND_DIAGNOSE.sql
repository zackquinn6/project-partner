-- ============================================
-- COMPLETE FIX AND DIAGNOSE FOR display_order ERROR
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: DIAGNOSE - Check what's actually in the database
-- ============================================
DO $$
DECLARE
  func_source TEXT;
  trigger_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSIS';
  RAISE NOTICE '========================================';
  
  -- Check function source
  SELECT pg_get_functiondef(oid) INTO func_source
  FROM pg_proc
  WHERE proname = 'add_custom_project_phase'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LIMIT 1;
  
  IF func_source IS NULL THEN
    RAISE NOTICE '❌ Function add_custom_project_phase does not exist';
  ELSE
    IF func_source ILIKE '%display_order%' THEN
      RAISE NOTICE '❌ Function contains display_order reference';
      RAISE NOTICE 'Function source (first 500 chars): %', substring(func_source, 1, 500);
    ELSE
      RAISE NOTICE '✅ Function does NOT contain display_order';
    END IF;
  END IF;
  
  -- Check triggers
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
    AND event_object_table = 'project_phases';
  
  RAISE NOTICE 'Triggers on project_phases: %', trigger_count;
  
  IF trigger_count > 0 THEN
    RAISE NOTICE '⚠️ Found triggers on project_phases - listing them:';
    FOR rec IN
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table = 'project_phases'
    LOOP
      RAISE NOTICE '  - Trigger: %, Event: %', rec.trigger_name, rec.event_manipulation;
      IF rec.action_statement ILIKE '%display_order%' THEN
        RAISE NOTICE '    ⚠️ This trigger references display_order!';
      END IF;
    END LOOP;
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 2: DROP ALL TRIGGERS ON project_phases
-- ============================================
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'project_phases'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.project_phases CASCADE', trigger_rec.trigger_name);
    RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
  END LOOP;
END $$;

-- ============================================
-- STEP 3: DROP FUNCTION COMPLETELY
-- ============================================
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase CASCADE;

-- ============================================
-- STEP 4: RECREATE FUNCTION CORRECTLY
-- ============================================
CREATE FUNCTION public.add_custom_project_phase(
  p_project_id UUID,
  p_phase_name TEXT DEFAULT NULL,
  p_phase_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  name TEXT,
  description TEXT,
  position_rule TEXT,
  position_value INTEGER,
  is_standard BOOLEAN,
  standard_phase_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phase_name TEXT;
  v_phase_description TEXT;
  v_is_standard BOOLEAN;
  v_standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  v_new_phase_id UUID;
  v_created_at TIMESTAMPTZ;
  v_updated_at TIMESTAMPTZ;
  v_position_rule TEXT;
  v_position_value INTEGER;
  v_new_operation_id UUID;
  v_new_step_id UUID;
BEGIN
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'Project ID is required';
  END IF;

  v_phase_name := COALESCE(p_phase_name, 'New Phase');
  v_phase_description := COALESCE(p_phase_description, NULL);
  v_is_standard := (p_project_id = v_standard_project_id);

  IF v_is_standard THEN
    v_position_rule := 'last_minus_n';
    v_position_value := 1;
  ELSE
    v_position_rule := NULL;
    v_position_value := NULL;
  END IF;

  INSERT INTO public.project_phases (
    project_id,
    name,
    description,
    is_standard,
    standard_phase_id,
    position_rule,
    position_value
  ) VALUES (
    p_project_id,
    v_phase_name,
    v_phase_description,
    v_is_standard,
    NULL,
    v_position_rule,
    v_position_value
  )
  RETURNING 
    project_phases.id,
    project_phases.created_at,
    project_phases.updated_at
  INTO 
    v_new_phase_id,
    v_created_at,
    v_updated_at;

  INSERT INTO public.template_operations (
    project_id,
    phase_id,
    name,
    description,
    flow_type
  ) VALUES (
    p_project_id,
    v_new_phase_id,
    'New Operation',
    'Operation description',
    'prime'
  )
  RETURNING template_operations.id INTO v_new_operation_id;

  INSERT INTO public.template_steps (
    operation_id,
    step_number,
    step_title,
    description,
    content_sections,
    materials,
    tools,
    outputs,
    apps,
    estimated_time_minutes,
    flow_type,
    step_type
  ) VALUES (
    v_new_operation_id,
    1,
    'New Step',
    'Step description',
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    0,
    'prime',
    'prime'
  )
  RETURNING template_steps.id INTO v_new_step_id;

  RETURN QUERY
  SELECT 
    v_new_phase_id AS id,
    p_project_id AS project_id,
    v_phase_name AS name,
    v_phase_description AS description,
    v_position_rule AS position_rule,
    v_position_value AS position_value,
    v_is_standard AS is_standard,
    NULL::UUID AS standard_phase_id,
    v_created_at AS created_at,
    v_updated_at AS updated_at;
END;
$$;

-- ============================================
-- STEP 5: VERIFY FUNCTION WAS CREATED CORRECTLY
-- ============================================
DO $$
DECLARE
  func_exists BOOLEAN;
  func_source TEXT;
  func_sql_only TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '========================================';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'add_custom_project_phase'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;

  IF NOT func_exists THEN
    RAISE EXCEPTION '❌ Function add_custom_project_phase was not created';
  END IF;

  RAISE NOTICE '✅ Function exists';

  SELECT pg_get_functiondef(oid) INTO func_source
  FROM pg_proc
  WHERE proname = 'add_custom_project_phase'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LIMIT 1;

  -- Remove comments and check only SQL code
  func_sql_only := regexp_replace(func_source, '--[^\n]*', '', 'g');
  func_sql_only := regexp_replace(func_sql_only, '/\*.*?\*/', '', 'gs');

  IF func_sql_only ~* '(^|[^a-z_])display_order([^a-z_]|$)' THEN
    RAISE EXCEPTION '❌ Function still contains display_order reference in SQL code';
  END IF;

  RAISE NOTICE '✅ Function does NOT contain display_order references';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX COMPLETE - Try adding a phase now!';
  RAISE NOTICE '========================================';
END $$;

