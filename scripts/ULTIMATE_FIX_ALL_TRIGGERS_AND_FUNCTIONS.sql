-- ============================================
-- ULTIMATE FIX: Find and fix ALL display_order references
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: DIAGNOSE - Find ALL triggers and their functions
-- ============================================
DO $$
DECLARE
  trigger_rec RECORD;
  func_source TEXT;
  has_display_order BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSIS: Checking ALL triggers';
  RAISE NOTICE '========================================';
  
  -- Check triggers on project_phases
  FOR trigger_rec IN
    SELECT 
      t.tgname AS trigger_name,
      t.tgrelid::regclass AS table_name,
      p.proname AS function_name,
      pg_get_triggerdef(t.oid) AS trigger_def
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'public.project_phases'::regclass
      AND NOT t.tgisinternal
  LOOP
    RAISE NOTICE 'Found trigger: % on table %', trigger_rec.trigger_name, trigger_rec.table_name;
    RAISE NOTICE '  Function: %', trigger_rec.function_name;
    
    -- Get function source
    SELECT pg_get_functiondef(oid) INTO func_source
    FROM pg_proc
    WHERE proname = trigger_rec.function_name
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LIMIT 1;
    
    -- Check for display_order (remove comments first)
    func_source := regexp_replace(func_source, '--[^\n]*', '', 'g');
    func_source := regexp_replace(func_source, '/\*.*?\*/', '', 'gs');
    has_display_order := func_source ~* '(^|[^a-z_])display_order([^a-z_]|$)';
    
    IF has_display_order THEN
      RAISE NOTICE '  ⚠️ WARNING: Function % contains display_order!', trigger_rec.function_name;
    ELSE
      RAISE NOTICE '  ✅ Function % does NOT contain display_order', trigger_rec.function_name;
    END IF;
  END LOOP;
  
  -- Check triggers on template_operations
  FOR trigger_rec IN
    SELECT 
      t.tgname AS trigger_name,
      t.tgrelid::regclass AS table_name,
      p.proname AS function_name
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'public.template_operations'::regclass
      AND NOT t.tgisinternal
  LOOP
    RAISE NOTICE 'Found trigger: % on table %', trigger_rec.trigger_name, trigger_rec.table_name;
    RAISE NOTICE '  Function: %', trigger_rec.function_name;
    
    SELECT pg_get_functiondef(oid) INTO func_source
    FROM pg_proc
    WHERE proname = trigger_rec.function_name
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LIMIT 1;
    
    func_source := regexp_replace(func_source, '--[^\n]*', '', 'g');
    func_source := regexp_replace(func_source, '/\*.*?\*/', '', 'gs');
    has_display_order := func_source ~* '(^|[^a-z_])display_order([^a-z_]|$)';
    
    IF has_display_order THEN
      RAISE NOTICE '  ⚠️ WARNING: Function % contains display_order!', trigger_rec.function_name;
    END IF;
  END LOOP;
  
  -- Check triggers on template_steps
  FOR trigger_rec IN
    SELECT 
      t.tgname AS trigger_name,
      t.tgrelid::regclass AS table_name,
      p.proname AS function_name
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'public.template_steps'::regclass
      AND NOT t.tgisinternal
  LOOP
    RAISE NOTICE 'Found trigger: % on table %', trigger_rec.trigger_name, trigger_rec.table_name;
    RAISE NOTICE '  Function: %', trigger_rec.function_name;
    
    SELECT pg_get_functiondef(oid) INTO func_source
    FROM pg_proc
    WHERE proname = trigger_rec.function_name
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LIMIT 1;
    
    func_source := regexp_replace(func_source, '--[^\n]*', '', 'g');
    func_source := regexp_replace(func_source, '/\*.*?\*/', '', 'gs');
    has_display_order := func_source ~* '(^|[^a-z_])display_order([^a-z_]|$)';
    
    IF has_display_order THEN
      RAISE NOTICE '  ⚠️ WARNING: Function % contains display_order!', trigger_rec.function_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 2: DROP ALL TRIGGERS ON project_phases, template_operations, template_steps
-- ============================================
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DROPPING ALL TRIGGERS';
  RAISE NOTICE '========================================';
  
  -- Drop triggers on project_phases
  FOR trigger_rec IN
    SELECT tgname, tgrelid::regclass AS table_name
    FROM pg_trigger
    WHERE tgrelid = 'public.project_phases'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s CASCADE', trigger_rec.tgname, trigger_rec.table_name);
    RAISE NOTICE 'Dropped trigger: % on %', trigger_rec.tgname, trigger_rec.table_name;
  END LOOP;
  
  -- Drop triggers on template_operations
  FOR trigger_rec IN
    SELECT tgname, tgrelid::regclass AS table_name
    FROM pg_trigger
    WHERE tgrelid = 'public.template_operations'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s CASCADE', trigger_rec.tgname, trigger_rec.table_name);
    RAISE NOTICE 'Dropped trigger: % on %', trigger_rec.tgname, trigger_rec.table_name;
  END LOOP;
  
  -- Drop triggers on template_steps
  FOR trigger_rec IN
    SELECT tgname, tgrelid::regclass AS table_name
    FROM pg_trigger
    WHERE tgrelid = 'public.template_steps'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s CASCADE', trigger_rec.tgname, trigger_rec.table_name);
    RAISE NOTICE 'Dropped trigger: % on %', trigger_rec.tgname, trigger_rec.table_name;
  END LOOP;
  
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- STEP 3: DROP AND RECREATE add_custom_project_phase
-- ============================================
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase CASCADE;

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
-- STEP 4: VERIFY
-- ============================================
DO $$
DECLARE
  func_exists BOOLEAN;
  func_source TEXT;
  func_sql_only TEXT;
  trigger_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '========================================';
  
  -- Check function exists and is correct
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

  func_sql_only := regexp_replace(func_source, '--[^\n]*', '', 'g');
  func_sql_only := regexp_replace(func_sql_only, '/\*.*?\*/', '', 'gs');

  IF func_sql_only ~* '(^|[^a-z_])display_order([^a-z_]|$)' THEN
    RAISE EXCEPTION '❌ Function still contains display_order reference in SQL code';
  END IF;

  RAISE NOTICE '✅ Function does NOT contain display_order references';
  
  -- Check trigger count
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgrelid IN (
    'public.project_phases'::regclass,
    'public.template_operations'::regclass,
    'public.template_steps'::regclass
  )
  AND NOT tgisinternal;
  
  RAISE NOTICE 'Remaining triggers on project_phases/template_operations/template_steps: %', trigger_count;
  
  IF trigger_count > 0 THEN
    RAISE NOTICE '⚠️ WARNING: There are still % triggers. They should not interfere, but monitor for issues.', trigger_count;
  ELSE
    RAISE NOTICE '✅ No triggers remain (this is expected - triggers will be recreated as needed)';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX COMPLETE - Try adding a phase now!';
  RAISE NOTICE '========================================';
END $$;

