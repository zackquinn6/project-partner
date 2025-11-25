-- ============================================
-- IMMEDIATE FIX: Fix custom_phase_metadata_check constraint violation
-- ============================================
-- Run this script directly in Supabase SQL Editor to fix the constraint violation
-- The issue is that add_custom_project_phase doesn't set custom_phase_name and
-- custom_phase_description when inserting into template_operations, which violates
-- the custom_phase_metadata_check constraint.

-- Step 1: Drop the function
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.add_custom_project_phase CASCADE;

-- Step 2: Recreate the function with custom_phase_name and custom_phase_description
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
  IF v_is_standard THEN
    v_position_rule := 'last_minus_n';
    v_position_value := 1;
  ELSE
    v_position_rule := NULL;
    v_position_value := NULL;
  END IF;

  -- Insert the new phase
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

  -- Create one operation with one step for the new phase
  -- CRITICAL FIX: Include custom_phase_name and custom_phase_description
  -- The custom_phase_metadata_check constraint requires that if is_custom_phase is true
  -- (computed from standard_phase_id IS NULL), then custom_phase_name must not be NULL.
  INSERT INTO public.template_operations (
    project_id,
    phase_id,
    name,
    description,
    flow_type,
    custom_phase_name,
    custom_phase_description,
    standard_phase_id
  ) VALUES (
    p_project_id,
    v_new_phase_id,
    'New Operation',
    'Operation description',
    'prime',
    v_phase_name, -- Required by custom_phase_metadata_check constraint
    v_phase_description, -- Optional but good to include
    NULL -- Explicitly NULL to ensure is_custom_phase is computed as true
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

  -- Return the new phase details
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

-- Step 3: Verify the function was created
DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'add_custom_project_phase'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO func_exists;

  IF NOT func_exists THEN
    RAISE EXCEPTION '❌ Function add_custom_project_phase was not created';
  END IF;

  RAISE NOTICE '✅ Function add_custom_project_phase recreated successfully';
  RAISE NOTICE '✅ Now includes custom_phase_name and custom_phase_description in template_operations INSERT';
  RAISE NOTICE '✅ This should fix the custom_phase_metadata_check constraint violation';
END $$;

