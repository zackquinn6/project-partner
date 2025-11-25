-- Comprehensive fix and verification for add_custom_project_phase
-- Migration: 20251126000007_comprehensive_fix_and_verify.sql
--
-- This migration:
-- 1. Verifies display_order column is removed
-- 2. Drops ALL possible function signatures
-- 3. Recreates the function with correct implementation
-- 4. Verifies no display_order references exist in any database objects

-- ============================================
-- STEP 1: Verify display_order column is removed
-- ============================================
DO $$
BEGIN
  -- Check if display_order still exists in project_phases
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'project_phases' 
      AND column_name = 'display_order'
  ) THEN
    RAISE EXCEPTION 'display_order column still exists in project_phases - please run migration 20251126000001_remove_display_order_column.sql first';
  END IF;

  -- Check if display_order still exists in template_operations
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'template_operations' 
      AND column_name = 'display_order'
  ) THEN
    RAISE EXCEPTION 'display_order column still exists in template_operations - please run migration 20251126000001_remove_display_order_column.sql first';
  END IF;

  -- Check if display_order still exists in template_steps
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'template_steps' 
      AND column_name = 'display_order'
  ) THEN
    RAISE EXCEPTION 'display_order column still exists in template_steps - please run migration 20251126000001_remove_display_order_column.sql first';
  END IF;
END $$;

-- ============================================
-- STEP 2: Drop ALL possible function signatures and dependencies
-- ============================================
-- Drop with CASCADE to remove any dependencies
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase CASCADE;

-- ============================================
-- STEP 3: Drop any triggers that might reference display_order
-- ============================================
DROP TRIGGER IF EXISTS set_display_order_on_phase_insert ON public.project_phases;
DROP TRIGGER IF EXISTS update_display_order_on_phase_insert ON public.project_phases;
DROP TRIGGER IF EXISTS sync_display_order_on_phase_insert ON public.project_phases;
DROP TRIGGER IF EXISTS trigger_set_display_order ON public.project_phases;
DROP TRIGGER IF EXISTS trigger_update_display_order ON public.project_phases;

-- ============================================
-- STEP 4: Recreate the function with correct implementation
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
  -- Validate inputs
  IF p_project_id IS NULL THEN
    RAISE EXCEPTION 'Project ID is required';
  END IF;

  -- Set default phase name if not provided
  v_phase_name := COALESCE(p_phase_name, 'New Phase');
  v_phase_description := COALESCE(p_phase_description, NULL);

  -- Determine if this is the Standard Project Foundation
  v_is_standard := (p_project_id = v_standard_project_id);

  -- For Standard Project Foundation, set position to 'last_minus_n' with value 1 (second-to-last)
  -- This places the new phase before the "Close Project" phase (which has position_rule = 'last')
  IF v_is_standard THEN
    v_position_rule := 'last_minus_n';
    v_position_value := 1;
  ELSE
    -- For regular projects, custom phases don't have position rules
    -- They will be ordered by creation time or by their position in the phases JSON
    v_position_rule := NULL;
    v_position_value := NULL;
  END IF;

  -- Insert the new phase (NO display_order - column has been removed)
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
    NULL, -- Custom phases don't have standard_phase_id
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

  -- Create one operation with one step for the new phase
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

  -- Create one step for the new operation
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

  -- Return the newly created phase
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

COMMENT ON FUNCTION public.add_custom_project_phase IS 
'Adds a custom phase to a project with one operation and one step.
For Standard Project Foundation, sets position_rule to "last_minus_n" with position_value = 1 (second-to-last).
For regular projects, sets position_rule to NULL (phases ordered by creation time or phases JSON order).
This function does NOT reference display_order - that column has been removed.';

-- ============================================
-- STEP 5: Verify function source code doesn't contain display_order
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

  IF func_source IS NULL THEN
    RAISE EXCEPTION 'Function add_custom_project_phase not found after creation';
  END IF;

  IF func_source ILIKE '%display_order%' THEN
    RAISE EXCEPTION 'Function add_custom_project_phase still contains display_order reference: %', func_source;
  END IF;
END $$;

