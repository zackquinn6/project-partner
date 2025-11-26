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
  v_position_rule TEXT;
  v_position_value INTEGER;
  v_new_operation_id UUID;
  v_new_step_id UUID;
  v_existing_phase_count INTEGER;
  v_conflicting_phase RECORD;
  v_standard_phases RECORD;
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
    -- For regular projects, set new custom phases to 'last_minus_n' with value 1 (second-to-last)
    -- This places the new phase before the "Close Project" phase (which has position_rule = 'last')
    -- The position can be edited after creation
    -- CRITICAL: Never allow custom phases to use 'last' position - it's reserved for standard "Close Project" phase
    -- CRITICAL: Never allow custom phases to use 'first' or 'nth' with value 1 - reserved for standard "Kickoff" phase
    v_position_rule := 'last_minus_n';
    v_position_value := 1;
    
    -- CRITICAL: Explicitly prevent reserved positions for custom phases
    IF v_position_rule = 'last' THEN
      RAISE EXCEPTION 'Position "last" is reserved for the standard "Close Project" phase and cannot be used by custom phases';
    END IF;
    
    IF v_position_rule = 'first' THEN
      RAISE EXCEPTION 'Position "first" is reserved for the standard "Kickoff" phase and cannot be used by custom phases';
    END IF;
    
    IF v_position_rule = 'nth' AND v_position_value = 1 THEN
      RAISE EXCEPTION 'Position "nth" with position_value = 1 is reserved for the standard "Kickoff" phase and cannot be used by custom phases';
    END IF;
    
    -- CRITICAL: Reorder existing last_minus_n phases to make room for the new phase
    -- When a new phase is added at last_minus_n with value 1, all existing last_minus_n phases
    -- should be incremented (slid forward) to make room
    -- This ensures phases are properly ordered and don't conflict
    -- NOTE: This reordering is ONLY for regular projects, NOT for standard projects
    
    -- First, check if there are any existing phases with last_minus_n
    SELECT COUNT(*) INTO v_existing_phase_count
    FROM public.project_phases pp
    WHERE pp.project_id = p_project_id
      AND pp.position_rule = 'last_minus_n';
    
    IF v_existing_phase_count > 0 THEN
      -- Increment position_value for all existing last_minus_n phases
      -- This slides them forward to make room for the new phase at position_value = 1
      UPDATE public.project_phases pp
      SET position_value = pp.position_value + 1,
          updated_at = NOW()
      WHERE pp.project_id = p_project_id
        AND pp.position_rule = 'last_minus_n';
      
      RAISE NOTICE 'Reordered % existing last_minus_n phases to make room for new phase', v_existing_phase_count;
    END IF;
    
    -- The new phase will use position_value = 1 (which is now available after reordering)
    
    -- CRITICAL: Validate that the new custom phase doesn't use position rules that conflict with standard phases
    -- Standard phases have these reserved position rules:
    -- - 'first' (Kickoff) - equivalent to 'nth' with position_value = 1 - RESERVED, cannot be used
    -- - 'nth' with position_value = 2 (Planning) - RESERVED, cannot be used
    -- - 'last_minus_n' with position_value = 1 (Ordering) - ALLOWED for custom phases (they can share this position)
    -- - 'last' (Close Project) - RESERVED, cannot be used
    -- Custom phases should NOT use the reserved position rules, but can share 'last_minus_n' with value 1
    
    -- Get all standard phases from Standard Project Foundation to check for conflicts
    FOR v_standard_phases IN
      SELECT pp.position_rule, pp.position_value
      FROM public.project_phases pp
      WHERE pp.project_id = v_standard_project_id
        AND pp.position_rule IS NOT NULL
    LOOP
      -- Check if the NEW phase we're about to create conflicts with standard phases
      -- CRITICAL: Recognize that 'first' and 'nth' with position_value = 1 are the same position
      -- CRITICAL: Allow 'last_minus_n' with value 1 to be shared between standard and custom phases
      IF (
        -- Check for exact matches on reserved rules (excluding 'last_minus_n' which can be shared)
        (v_position_rule = v_standard_phases.position_rule
         AND v_standard_phases.position_rule IN ('first', 'last')
         AND v_position_value IS NULL)
        -- Check for 'nth' conflicts (excluding value 1 which is equivalent to 'first')
        OR (v_standard_phases.position_rule = 'nth' 
            AND v_position_rule = 'nth' 
            AND v_position_value = v_standard_phases.position_value
            AND v_standard_phases.position_value != 1) -- Allow nth with value 1 (it's equivalent to 'first')
        -- CRITICAL: Check if new phase uses 'nth' with value 1, which conflicts with 'first'
        OR (v_standard_phases.position_rule = 'first' 
            AND v_position_rule = 'nth' 
            AND v_position_value = 1)
        -- CRITICAL: Check if new phase uses 'first', which conflicts with 'nth' with value 1
        OR (v_standard_phases.position_rule = 'nth' 
            AND v_standard_phases.position_value = 1
            AND v_position_rule = 'first')
      ) THEN
        -- Provide a clear error message indicating the conflict
        IF v_standard_phases.position_rule = 'first' THEN
          RAISE EXCEPTION 'Position "first" (or "nth" with position_value = 1) is reserved for the standard "Kickoff" phase and cannot be used by custom phases';
        ELSIF v_standard_phases.position_rule = 'nth' AND v_standard_phases.position_value = 1 THEN
          RAISE EXCEPTION 'Position "nth" with position_value = 1 (or "first") is reserved for the standard "Kickoff" phase and cannot be used by custom phases';
        ELSE
          RAISE EXCEPTION 'Position rule "%" with position_value % is reserved for standard phases and cannot be used by custom phases',
            v_standard_phases.position_rule,
            COALESCE(v_standard_phases.position_value::TEXT, 'NULL');
        END IF;
      END IF;
    END LOOP;
    
    -- Also check for duplicate position rules within custom phases in this project
    -- Ensure that 'first' and 'nth' with value 1 are treated as the same position
    SELECT * INTO v_conflicting_phase
    FROM public.project_phases pp
    WHERE pp.project_id = p_project_id
      AND (
        -- Check if another custom phase already uses 'last_minus_n' with the same value
        (pp.position_rule = v_position_rule AND pp.position_value = v_position_value)
        -- Check if another custom phase uses 'first' when we're trying to use 'nth' with value 1
        OR (v_position_rule = 'nth' AND v_position_value = 1 AND pp.position_rule = 'first')
        -- Check if another custom phase uses 'nth' with value 1 when we're trying to use 'first'
        OR (v_position_rule = 'first' AND pp.position_rule = 'nth' AND pp.position_value = 1)
      )
      LIMIT 1;
    
    IF v_conflicting_phase IS NOT NULL THEN
      IF v_position_rule = 'nth' AND v_position_value = 1 THEN
        RAISE EXCEPTION 'Position "nth" with position_value = 1 (or "first") is already used by another phase';
      ELSIF v_position_rule = 'first' THEN
        RAISE EXCEPTION 'Position "first" (or "nth" with position_value = 1) is already used by another phase';
      ELSE
        RAISE EXCEPTION 'Position rule "%" with position_value % is already used by another phase',
          v_position_rule,
          COALESCE(v_position_value::TEXT, 'NULL');
      END IF;
    END IF;
  END IF;

  -- Insert the new phase
  -- CRITICAL: Use column names directly in RETURNING (no table qualifiers allowed)
  -- Then use column aliases in RETURNING to avoid ambiguity with RETURNS TABLE columns
  WITH inserted_phase AS (
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
      id AS phase_id,
      created_at AS phase_created_at,
      updated_at AS phase_updated_at
  )
  SELECT 
    ip.phase_id,
    ip.phase_created_at,
    ip.phase_updated_at
  INTO 
    v_new_phase_id,
    v_created_at,
    v_updated_at
  FROM inserted_phase ip;

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
For regular projects, reorders existing last_minus_n phases to make room for the new phase at position_value = 1.';

