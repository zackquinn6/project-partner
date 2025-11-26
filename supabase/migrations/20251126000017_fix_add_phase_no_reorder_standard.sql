-- Fix add_custom_project_phase to not reorder existing phases in standard projects
-- Migration: 20251126000017_fix_add_phase_no_reorder_standard.sql
--
-- Issue: When adding a new phase to a standard project, existing phases are being reordered.
-- Design intent: Phases should not be reordered - new phase should use next available position_value
-- without modifying existing phases' position_value.
--
-- Example: If we have 4 phases (Kickoff, Planning, Ordering, Close Project) and add a 5th:
-- - Ordering should stay at position 3 (last_minus_n, value 1)
-- - New phase should go to position 4 (last_minus_n, value 2)
-- - Close Project stays at position 5 (last)
--
-- Current bug: Ordering gets moved to position 4, new phase goes to position 4 (conflict)

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
  v_inserted_phase RECORD;
  v_position_rule TEXT;
  v_position_value INTEGER;
  v_new_operation_id UUID;
  v_new_step_id UUID;
  v_existing_phase_count INTEGER;
  v_conflicting_phase RECORD;
  v_standard_phases RECORD;
  v_reserved_position_values INTEGER[] := ARRAY[]::INTEGER[];
  v_standard_last_minus_n_values INTEGER[] := ARRAY[]::INTEGER[];
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
  -- CRITICAL: Do NOT modify existing phases - just find the next available position_value
  IF v_is_standard THEN
    v_position_rule := 'last_minus_n';
    v_position_value := 1;
    
    -- Find the next available position_value without modifying existing phases
    -- Start at 1 and increment until we find an available slot
    LOOP
      SELECT COUNT(*) INTO v_existing_phase_count
      FROM public.project_phases pp
      WHERE pp.project_id = v_standard_project_id
        AND pp.position_rule = v_position_rule
        AND pp.position_value = v_position_value;
      
      -- If this position is available, use it
      EXIT WHEN v_existing_phase_count = 0;
      
      -- Otherwise, try the next position
      v_position_value := v_position_value + 1;
      
      -- Safety check to prevent infinite loop
      IF v_position_value > 100 THEN
        RAISE EXCEPTION 'Could not find available position for new standard phase';
      END IF;
    END LOOP;
    
    -- CRITICAL: Do NOT update existing phases' position_value
    -- The new phase will use the next available position_value, and existing phases keep their values
  ELSE
    -- For regular projects, new custom phases always land at "last minus one" position
    -- Design intent: Each new phase is added to the end of the list without reordering existing phases
    -- The new phase uses the next available position_value for 'last_minus_n'
    v_position_rule := 'last_minus_n';
    
    -- CRITICAL: Find the next available position_value that doesn't conflict with:
    -- 1. Existing 'last_minus_n' phases in this project
    -- 2. Standard phases from Standard Project Foundation (especially Ordering which uses position_value = 1)
    
    -- Get all 'last_minus_n' position_values from standard phases
    SELECT ARRAY_AGG(pp.position_value) INTO v_standard_last_minus_n_values
    FROM public.project_phases pp
    WHERE pp.project_id = v_standard_project_id
      AND pp.position_rule = 'last_minus_n'
      AND pp.position_value IS NOT NULL;
    
    -- Get all 'last_minus_n' position_values from existing phases in this project
    SELECT ARRAY_AGG(pp.position_value) INTO v_reserved_position_values
    FROM public.project_phases pp
    WHERE pp.project_id = p_project_id
      AND pp.position_rule = 'last_minus_n'
      AND pp.position_value IS NOT NULL;
    
    -- Combine both arrays to get all reserved values
    IF v_standard_last_minus_n_values IS NOT NULL THEN
      IF v_reserved_position_values IS NULL THEN
        v_reserved_position_values := v_standard_last_minus_n_values;
      ELSE
        v_reserved_position_values := v_reserved_position_values || v_standard_last_minus_n_values;
      END IF;
    END IF;
    
    -- Find the next available position_value starting from 1
    v_position_value := 1;
    LOOP
      -- Check if this position_value is available (not in reserved list)
      IF v_reserved_position_values IS NULL OR NOT (v_position_value = ANY(v_reserved_position_values)) THEN
        -- Found an available position_value
        EXIT;
      END IF;
      
      -- Try next position_value
      v_position_value := v_position_value + 1;
      
      -- Safety check to prevent infinite loop
      IF v_position_value > 100 THEN
        RAISE EXCEPTION 'Could not find available position_value for new custom phase (too many phases)';
      END IF;
    END LOOP;
    
    -- CRITICAL: Final validation - ensure the position doesn't conflict with any standard phase
    -- This is a safety check to verify we didn't miss anything
    FOR v_standard_phases IN
      SELECT pp.position_rule, pp.position_value
      FROM public.project_phases pp
      WHERE pp.project_id = v_standard_project_id
        AND pp.position_rule IS NOT NULL
    LOOP
      -- Check if the new phase's position conflicts with any standard phase position
      IF (
        -- Standard phase uses 'last_minus_n' with the same position_value - conflict
        (v_standard_phases.position_rule = 'last_minus_n' 
         AND v_standard_phases.position_value IS NOT NULL
         AND v_standard_phases.position_value = v_position_value)
      ) THEN
        -- This should never happen if the loop above worked correctly, but provide error message
        RAISE EXCEPTION 'Position "last_minus_n" with position_value = % is reserved for standard phases and cannot be used by custom phases',
          v_standard_phases.position_value;
      END IF;
    END LOOP;
  END IF;

  -- Insert the new phase
  -- CRITICAL: Insert first, then query back to avoid RETURNING ambiguity with RETURNS TABLE
  -- This completely avoids any column name conflicts
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
  );
  
  -- Query back the inserted row using a unique combination of fields
  -- This avoids any ambiguity with RETURNS TABLE columns
  SELECT 
    pp.id,
    pp.created_at,
    pp.updated_at
  INTO STRICT
    v_new_phase_id,
    v_created_at,
    v_updated_at
  FROM public.project_phases pp
  WHERE pp.project_id = p_project_id
    AND pp.name = v_phase_name
    AND pp.position_rule = v_position_rule
    AND COALESCE(pp.position_value, -1) = COALESCE(v_position_value, -1)
    AND pp.created_at >= NOW() - INTERVAL '1 second'
  ORDER BY pp.created_at DESC
  LIMIT 1;

  -- Create one operation with one step for the new phase
  -- IMPORTANT: is_custom_phase is a GENERATED column (computed automatically)
  -- For Standard Project Foundation, create standard phases (is_standard_phase = TRUE, no custom_phase_name)
  -- For regular projects, create custom phases (custom_phase_name required, is_standard_phase = FALSE)
  -- The custom_phase_metadata_check constraint requires that if is_custom_phase is true,
  -- then custom_phase_name must not be NULL.
  IF v_is_standard THEN
    -- Standard Project Foundation: Create standard phase operations
    -- is_custom_phase will be computed as FALSE (since custom_phase_name is NULL)
    INSERT INTO public.template_operations (
      project_id,
      phase_id,
      name,
      description,
      flow_type,
      is_standard_phase
    ) VALUES (
      p_project_id,
      v_new_phase_id,
      'New Operation',
      'Operation description',
      'prime',
      TRUE -- This is a standard phase operation
    )
    RETURNING id INTO v_new_operation_id;
  ELSE
    -- Regular projects: Create custom phase operations
    -- is_custom_phase will be computed as TRUE (since custom_phase_name is NOT NULL)
    INSERT INTO public.template_operations (
      project_id,
      phase_id,
      name,
      description,
      flow_type,
      custom_phase_name,
      custom_phase_description,
      is_standard_phase
    ) VALUES (
      p_project_id,
      v_new_phase_id,
      'New Operation',
      'Operation description',
      'prime',
      v_phase_name,
      v_phase_description,
      FALSE -- This is a custom phase operation
    )
    RETURNING id INTO v_new_operation_id;
  END IF;

  -- Create one step for the operation
  INSERT INTO public.template_steps (
    operation_id,
    step_number,
    step_title,
    description
  ) VALUES (
    v_new_operation_id,
    1,
    'New Step',
    'Step description'
  )
  RETURNING id INTO v_new_step_id;

  -- CRITICAL: Final validation - ensure the phase wasn't created with a conflicting position
  -- This is a safety check to verify the phase doesn't conflict with any standard phase position
  IF NOT v_is_standard THEN
    -- Check if the phase position conflicts with any standard phase position
    FOR v_standard_phases IN
      SELECT pp.position_rule, pp.position_value
      FROM public.project_phases pp
      WHERE pp.project_id = v_standard_project_id
        AND pp.position_rule IS NOT NULL
    LOOP
      -- Check for conflicts with standard phase positions
      IF (
        (v_standard_phases.position_rule = 'first' AND (v_position_rule = 'first' OR (v_position_rule = 'nth' AND v_position_value = 1)))
        OR (v_standard_phases.position_rule = 'last' AND v_position_rule = 'last')
        OR (v_standard_phases.position_rule = 'nth' AND v_position_rule = 'nth' AND v_position_value = v_standard_phases.position_value)
        OR (v_standard_phases.position_rule = 'last_minus_n' AND v_position_rule = 'last_minus_n' AND v_position_value = v_standard_phases.position_value)
      ) THEN
        -- Delete the phase we just created since it has an invalid position
        DELETE FROM public.project_phases WHERE id = v_new_phase_id;
        RAISE EXCEPTION 'Custom phase position conflicts with standard phase position "%" (position_value: %)',
          v_standard_phases.position_rule,
          COALESCE(v_standard_phases.position_value::TEXT, 'NULL');
      END IF;
    END LOOP;
  END IF;

  -- Return the new phase
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
'Adds a new phase to a project. For standard projects, finds the next available position_value without modifying existing phases.
For regular projects, new custom phases always land at "last minus one" position. The new phase uses the next available position_value 
for last_minus_n (max existing + 1), ensuring phases are added to the end of the list without reordering existing phases.
Custom phases are prevented from using any position occupied by a standard phase (including first and last).';

