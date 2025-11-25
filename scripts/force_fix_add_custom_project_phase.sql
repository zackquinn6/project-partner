-- Force fix add_custom_project_phase - run this directly in Supabase SQL Editor
-- This script will completely replace the function regardless of current state

-- ============================================
-- STEP 1: Drop function with all possible signatures
-- ============================================
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase CASCADE;

-- ============================================
-- STEP 2: Drop any triggers that might interfere
-- ============================================
DROP TRIGGER IF EXISTS set_display_order_on_phase_insert ON public.project_phases;
DROP TRIGGER IF EXISTS update_display_order_on_phase_insert ON public.project_phases;
DROP TRIGGER IF EXISTS sync_display_order_on_phase_insert ON public.project_phases;
DROP TRIGGER IF EXISTS trigger_set_display_order ON public.project_phases;
DROP TRIGGER IF EXISTS trigger_update_display_order ON public.project_phases;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_phase_insert ON public.project_phases;

-- ============================================
-- STEP 3: Create the function WITHOUT any display_order references
-- ============================================
CREATE OR REPLACE FUNCTION public.add_custom_project_phase(
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
-- STEP 4: Verify function was created correctly
-- ============================================
DO $$
DECLARE
  func_exists BOOLEAN;
  func_source TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'add_custom_project_phase'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;

  IF NOT func_exists THEN
    RAISE EXCEPTION 'Function add_custom_project_phase was not created';
  END IF;

  SELECT pg_get_functiondef(oid) INTO func_source
  FROM pg_proc
  WHERE proname = 'add_custom_project_phase'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LIMIT 1;

  -- Remove comments and check only SQL code
  func_source := regexp_replace(func_source, '--[^\n]*', '', 'g');
  func_source := regexp_replace(func_source, '/\*.*?\*/', '', 'gs');

  IF func_source ~* '(^|[^a-z_])display_order([^a-z_]|$)' THEN
    RAISE EXCEPTION 'Function still contains display_order reference in SQL code';
  END IF;

  RAISE NOTICE '✅ Function add_custom_project_phase created successfully';
  RAISE NOTICE '✅ Function does not contain display_order references';
END $$;

