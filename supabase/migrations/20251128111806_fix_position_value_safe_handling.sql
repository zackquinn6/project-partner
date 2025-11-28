-- Migration: Fix position_value integer error with safe type handling
-- This version uses a helper function to safely handle any type errors

BEGIN;

-- Step 1: Create a helper function to safely convert position_value to INTEGER
CREATE OR REPLACE FUNCTION safe_position_value(
  p_position_rule TEXT,
  p_position_value ANYELEMENT
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Always NULL for first/last rules
  IF p_position_rule IN ('first', 'last') THEN
    RETURN NULL;
  END IF;
  
  -- For nth rule, try to return as INTEGER, NULL on any error
  IF p_position_rule = 'nth' THEN
    IF p_position_value IS NULL THEN
      RETURN NULL;
    END IF;
    
    -- Try to cast to INTEGER
    BEGIN
      RETURN p_position_value::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Step 2: Fix ALL bad data in project_phases
-- Set position_value to NULL for any phase with first/last rule
UPDATE public.project_phases
SET position_value = NULL
WHERE position_rule IN ('first', 'last')
  AND position_value IS NOT NULL;

-- Step 3: Also fix any nth rules that have invalid position_value
-- This handles cases where position_value might be a string
UPDATE public.project_phases
SET position_value = NULL
WHERE position_rule = 'nth'
  AND position_value IS NOT NULL
  AND (
    -- Check if position_value is not a valid integer
    position_value::text !~ '^[0-9]+$'
    OR position_value::text = 'last'
    OR position_value::text = 'first'
  );

-- Step 4: Recreate create_project_with_standard_foundation_v2 with safe handling
CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  p_project_name TEXT,
  p_project_description TEXT,
  p_category TEXT DEFAULT 'general',
  p_created_by UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project_id UUID;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  std_phase RECORD;
  new_phase_id UUID;
  std_operation RECORD;
  new_operation_id UUID;
  category_array TEXT[];
  safe_pos_value INTEGER;
BEGIN
  -- Convert single category text to array
  category_array := ARRAY[COALESCE(p_category, 'general')];
  
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
    category_array,
    'draft',
    p_created_by,
    true
  ) RETURNING id INTO new_project_id;

  -- Copy phases from standard project
  -- Use helper function to safely get position_value
  -- CRITICAL: Order by position_rule first, then by safe position_value
  -- This avoids type errors in ORDER BY clause
  FOR std_phase IN
    WITH phase_data AS (
      SELECT 
        id,
        project_id,
        name,
        description,
        is_standard,
        position_rule,
        position_value,
        -- Use helper function to safely get position_value
        safe_position_value(position_rule, position_value) AS safe_position_value,
        -- Create a safe ordering value that doesn't require type casting
        CASE 
          WHEN position_rule = 'first' THEN 0
          WHEN position_rule = 'last' THEN 999999
          WHEN position_rule = 'nth' THEN 
            COALESCE(safe_position_value('nth', position_value), 999998)
          ELSE 999998
        END AS order_value
      FROM public.project_phases
      WHERE project_id = standard_project_id
    )
    SELECT * FROM phase_data
    ORDER BY order_value
  LOOP
    -- Use the safe_position_value from the SELECT
    safe_pos_value := std_phase.safe_position_value;
    
    INSERT INTO public.project_phases (
      project_id,
      name,
      description,
      is_standard,
      position_rule,
      position_value
    ) VALUES (
      new_project_id,
      std_phase.name,
      std_phase.description,
      std_phase.is_standard,
      std_phase.position_rule,
      safe_pos_value
    ) RETURNING id INTO new_phase_id;

    -- Copy operations for this phase
    FOR std_operation IN
      SELECT 
        id,
        project_id,
        phase_id,
        operation_name,
        operation_description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        source_operation_id,
        is_reference
      FROM public.template_operations
      WHERE project_id = standard_project_id
        AND phase_id = std_phase.id
      ORDER BY display_order
    LOOP
      INSERT INTO public.template_operations (
        project_id,
        phase_id,
        operation_name,
        operation_description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        source_operation_id,
        is_reference
      ) VALUES (
        new_project_id,
        new_phase_id,
        std_operation.operation_name,
        std_operation.operation_description,
        std_operation.flow_type,
        std_operation.user_prompt,
        std_operation.alternate_group,
        std_operation.display_order,
        std_operation.id,
        true
      ) RETURNING id INTO new_operation_id;

      -- Copy steps for this operation
      INSERT INTO public.template_steps (
        operation_id,
        step_title,
        description,
        display_order,
        content_sections,
        materials,
        tools,
        outputs,
        apps,
        flow_type,
        step_type,
        time_estimate_low,
        time_estimate_medium,
        time_estimate_high,
        workers_needed,
        skill_level
      )
      SELECT 
        new_operation_id,
        step_title,
        description,
        display_order,
        content_sections,
        materials,
        tools,
        outputs,
        apps,
        flow_type,
        step_type,
        time_estimate_low,
        time_estimate_medium,
        time_estimate_high,
        workers_needed,
        skill_level
      FROM public.template_steps
      WHERE operation_id = std_operation.id
      ORDER BY display_order;
    END LOOP;
  END LOOP;

  -- Rebuild phases JSON
  PERFORM rebuild_phases_json_from_project_phases(new_project_id);

  RETURN new_project_id;
END;
$$;

COMMENT ON FUNCTION public.create_project_with_standard_foundation_v2 IS 
'Creates a new project template with standard phases. Uses safe_position_value helper function to handle type errors.';

-- Step 5: Also fix create_project_revision_v2
CREATE OR REPLACE FUNCTION public.create_project_revision_v2(
  source_project_id UUID,
  revision_notes_text TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project_id UUID;
  source_phase RECORD;
  new_phase_id UUID;
  source_operation RECORD;
  new_operation_id UUID;
  new_revision_number INTEGER;
  safe_pos_value INTEGER;
BEGIN
  -- Get the next revision number
  SELECT COALESCE(MAX(revision_number), 0) + 1
  INTO new_revision_number
  FROM projects
  WHERE id = source_project_id OR parent_project_id = source_project_id;

  -- Create new project revision
  INSERT INTO projects (
    name,
    description,
    category,
    publish_status,
    created_by,
    is_current_version,
    parent_project_id,
    revision_number,
    revision_notes
  )
  SELECT 
    name || ' (Rev ' || new_revision_number || ')',
    description,
    category,
    'draft',
    created_by,
    false,
    source_project_id,
    new_revision_number,
    revision_notes_text
  FROM projects
  WHERE id = source_project_id
  RETURNING id INTO new_project_id;

  -- Copy phases
  -- Use helper function to safely get position_value
  -- CRITICAL: Order by position_rule first, then by safe position_value
  -- This avoids type errors in ORDER BY clause
  FOR source_phase IN
    WITH phase_data AS (
      SELECT 
        id,
        project_id,
        name,
        description,
        is_standard,
        position_rule,
        position_value,
        -- Use helper function to safely get position_value
        safe_position_value(position_rule, position_value) AS safe_position_value,
        -- Create a safe ordering value that doesn't require type casting
        CASE 
          WHEN position_rule = 'first' THEN 0
          WHEN position_rule = 'last' THEN 999999
          WHEN position_rule = 'nth' THEN 
            COALESCE(safe_position_value('nth', position_value), 999998)
          ELSE 999998
        END AS order_value
      FROM project_phases
      WHERE project_id = source_project_id
    )
    SELECT * FROM phase_data
    ORDER BY order_value
  LOOP
    -- Use the safe_position_value from the SELECT
    safe_pos_value := source_phase.safe_position_value;
    
    INSERT INTO project_phases (
      project_id,
      name,
      description,
      is_standard,
      position_rule,
      position_value
    )
    VALUES (
      new_project_id,
      source_phase.name,
      source_phase.description,
      source_phase.is_standard,
      source_phase.position_rule,
      safe_pos_value
    )
    RETURNING id INTO new_phase_id;

    -- Copy operations for this phase
    FOR source_operation IN
      SELECT * FROM template_operations
      WHERE phase_id = source_phase.id
      ORDER BY display_order
    LOOP
      INSERT INTO template_operations (
        project_id,
        phase_id,
        operation_name,
        operation_description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        source_operation_id,
        is_reference
      )
      SELECT 
        new_project_id,
        new_phase_id,
        operation_name,
        operation_description,
        flow_type,
        user_prompt,
        alternate_group,
        display_order,
        source_operation.id,
        true
      FROM template_operations
      WHERE id = source_operation.id
      RETURNING id INTO new_operation_id;

      -- Copy steps for this operation
      INSERT INTO template_steps (
        operation_id,
        step_title,
        description,
        display_order,
        content_sections,
        materials,
        tools,
        outputs,
        apps,
        flow_type,
        step_type,
        time_estimate_low,
        time_estimate_medium,
        time_estimate_high,
        workers_needed,
        skill_level
      )
      SELECT 
        new_operation_id,
        step_title,
        description,
        display_order,
        content_sections,
        materials,
        tools,
        outputs,
        apps,
        flow_type,
        step_type,
        time_estimate_low,
        time_estimate_medium,
        time_estimate_high,
        workers_needed,
        skill_level
      FROM template_steps
      WHERE operation_id = source_operation.id
      ORDER BY display_order;
    END LOOP;
  END LOOP;

  -- Rebuild phases JSON
  PERFORM rebuild_phases_json_from_project_phases(new_project_id);

  RETURN new_project_id;
END;
$$;

COMMENT ON FUNCTION public.create_project_revision_v2 IS 
'Creates a new project revision. Uses safe_position_value helper function to handle type errors.';

COMMIT;

