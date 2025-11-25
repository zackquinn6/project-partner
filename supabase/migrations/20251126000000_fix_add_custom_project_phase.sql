-- Fix add_custom_project_phase RPC function to use position_rule/position_value instead of display_order
-- Migration: 20251126000000_fix_add_custom_project_phase.sql
--
-- This migration fixes the add_custom_project_phase function to work without display_order.
-- It now uses position_rule and position_value for positioning phases.

-- ============================================
-- STEP 1: Drop existing function if it exists
-- ============================================
DROP FUNCTION IF EXISTS public.add_custom_project_phase(
  p_project_id UUID,
  p_phase_name TEXT,
  p_phase_description TEXT
);

-- ============================================
-- STEP 2: Create fixed add_custom_project_phase function
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
    -- Always set to 'last_minus_n' with value 1 for new phases in Standard Project Foundation
    v_position_rule := 'last_minus_n';
    v_position_value := 1;
  ELSE
    -- For regular projects, custom phases don't have position rules
    -- They will be ordered by creation time or by their position in the phases JSON
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
    v_new_phase_id,
    p_project_id,
    v_phase_name,
    v_phase_description,
    v_position_rule,
    v_position_value,
    v_is_standard,
    NULL::UUID,
    v_created_at,
    v_updated_at;
END;
$$;

-- ============================================
-- STEP 3: Add comment
-- ============================================
COMMENT ON FUNCTION public.add_custom_project_phase IS 
'Adds a custom phase to a project with one operation and one step.
For Standard Project Foundation, sets position_rule to "last_minus_n" with position_value = 1 (second-to-last).
For regular projects, sets position_rule to NULL (phases ordered by creation time or phases JSON order).';

