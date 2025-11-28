-- Migration: Fix position_value correctly
-- Fix bad data and write function correctly - no sanitization needed

BEGIN;

-- Step 1: Fix bad data in project_phases
-- CRITICAL: Set position_value to NULL for ALL phases with first/last rules
-- This ensures no invalid data exists before the function runs
UPDATE public.project_phases
SET position_value = NULL
WHERE position_rule IN ('first', 'last');

-- Step 1.5: DIAGNOSTIC - Check for any bad data in standard project and column type
DO $$
DECLARE
  bad_data_count INTEGER;
  bad_data_record RECORD;
  column_type_info RECORD;
BEGIN
  -- Check the actual column type
  SELECT 
    data_type,
    udt_name,
    column_default
  INTO column_type_info
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'project_phases'
    AND column_name = 'position_value';
  
  RAISE NOTICE 'DIAGNOSTIC: position_value column type: %, UDT: %, Default: %', 
    column_type_info.data_type,
    column_type_info.udt_name,
    column_type_info.column_default;
  
  -- Check for any phases with position_rule = 'last' that have non-NULL position_value
  SELECT COUNT(*) INTO bad_data_count
  FROM public.project_phases
  WHERE project_id = '00000000-0000-0000-0000-000000000001'::UUID
    AND position_rule = 'last'
    AND position_value IS NOT NULL;
  
  IF bad_data_count > 0 THEN
    RAISE WARNING 'Found % phases in standard project with position_rule=last but non-NULL position_value', bad_data_count;
    
    -- Show the bad data
    FOR bad_data_record IN
      SELECT id, name, position_rule, position_value, pg_typeof(position_value) as value_type
      FROM public.project_phases
      WHERE project_id = '00000000-0000-0000-0000-000000000001'::UUID
        AND position_rule = 'last'
        AND position_value IS NOT NULL
    LOOP
      RAISE WARNING 'Bad data: Phase % (%), position_rule=%, position_value=%, type=%', 
        bad_data_record.name, 
        bad_data_record.id, 
        bad_data_record.position_rule,
        bad_data_record.position_value,
        bad_data_record.value_type;
    END LOOP;
  END IF;
  
  -- Check ALL phases in standard project
  RAISE NOTICE 'DIAGNOSTIC: All phases in standard project:';
  FOR bad_data_record IN
    SELECT name, position_rule, position_value, pg_typeof(position_value) as value_type
    FROM public.project_phases
    WHERE project_id = '00000000-0000-0000-0000-000000000001'::UUID
    ORDER BY position_rule, name
  LOOP
    RAISE NOTICE '  Phase: %, Rule: %, Value: %, Type: %', 
      bad_data_record.name,
      bad_data_record.position_rule,
      bad_data_record.position_value,
      bad_data_record.value_type;
    END LOOP;
END $$ LANGUAGE plpgsql;

-- Step 2: Recreate create_project_with_standard_foundation_v2 correctly
-- Function reads position_rule and sets position_value accordingly
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
  final_position_value INTEGER;
  debug_position_value_text TEXT;
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
  -- CRITICAL: Use UNION to completely separate first/last (no position_value) from nth (with position_value)
  -- This avoids reading position_value for first/last rules which may contain invalid data
  FOR std_phase IN
    SELECT 
      phase_id,
      phase_project_id,
      phase_name,
      phase_description,
      phase_is_standard,
      phase_position_rule,
      phase_position_value
    FROM (
      -- First: phases with first/last/last_minus_n rules - never read position_value
      SELECT 
        id AS phase_id,
        project_id AS phase_project_id,
        name AS phase_name,
        description AS phase_description,
        is_standard AS phase_is_standard,
        position_rule AS phase_position_rule,
        NULL::INTEGER AS phase_position_value,
        CASE 
          WHEN position_rule = 'first' THEN 1
          WHEN position_rule = 'last_minus_n' THEN 998
          WHEN position_rule = 'last' THEN 999
          ELSE 100
        END AS sort_order,
        CASE 
          WHEN position_rule = 'first' THEN 1
          WHEN position_rule = 'last_minus_n' THEN 998
          WHEN position_rule = 'last' THEN 999999
          ELSE 0
        END AS order_secondary
      FROM public.project_phases pp
      WHERE project_id = standard_project_id
        AND position_rule IN ('first', 'last', 'last_minus_n')
      
      UNION ALL
      
      -- Second: phases with nth rule - read position_value with explicit INTEGER cast
      SELECT 
        id AS phase_id,
        project_id AS phase_project_id,
        name AS phase_name,
        description AS phase_description,
        is_standard AS phase_is_standard,
        position_rule AS phase_position_rule,
        CASE 
          WHEN position_value IS NULL THEN NULL::INTEGER
          ELSE position_value::INTEGER
        END AS phase_position_value,
        100 AS sort_order,
        COALESCE(position_value::INTEGER, 0) AS order_secondary
      FROM public.project_phases
      WHERE project_id = standard_project_id
        AND position_rule = 'nth'
    ) AS phase_union
    ORDER BY sort_order, order_secondary
  LOOP
    -- DEBUG: Log the values before INSERT
    RAISE NOTICE 'DEBUG: Phase: %, Rule: %, Position Value (raw): %, Type: %', 
      std_phase.phase_name, 
      std_phase.phase_position_rule,
      COALESCE(std_phase.phase_position_value::TEXT, 'NULL'),
      pg_typeof(std_phase.phase_position_value);
    
    -- Calculate position_value with explicit type checking
    IF std_phase.phase_position_rule IN ('first', 'last', 'last_minus_n') THEN
      final_position_value := NULL;
      RAISE NOTICE 'DEBUG: Setting position_value to NULL for rule: %', std_phase.phase_position_rule;
    ELSIF std_phase.phase_position_rule = 'nth' THEN
      IF std_phase.phase_position_value IS NULL THEN
        final_position_value := NULL;
        RAISE NOTICE 'DEBUG: position_value is NULL for nth rule';
      ELSE
        -- Explicitly cast to INTEGER to catch any type errors
        BEGIN
          final_position_value := std_phase.phase_position_value::INTEGER;
          RAISE NOTICE 'DEBUG: Using position_value: % (cast to integer)', final_position_value;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION 'Cannot cast position_value to INTEGER. Rule: %, Value: %, Type: %, Error: %', 
            std_phase.phase_position_rule,
            std_phase.phase_position_value,
            pg_typeof(std_phase.phase_position_value),
            SQLERRM;
        END;
      END IF;
    ELSE
      final_position_value := NULL;
      RAISE NOTICE 'DEBUG: Unknown position_rule: %, setting position_value to NULL', std_phase.phase_position_rule;
    END IF;
    
    RAISE NOTICE 'DEBUG: Final position_value before INSERT: % (type: %)', 
      final_position_value, 
      pg_typeof(final_position_value);
    
    -- CRITICAL: Ensure final_position_value is actually INTEGER or NULL
    -- If it's not NULL and not integer, something is wrong
    IF final_position_value IS NOT NULL THEN
      -- Try to cast to integer - this will fail if it's not a valid integer
      BEGIN
        final_position_value := final_position_value::INTEGER;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'final_position_value cannot be cast to INTEGER! Rule: %, Value: %, Type: %, Error: %', 
          std_phase.phase_position_rule,
          final_position_value,
          pg_typeof(final_position_value),
          SQLERRM;
      END;
    END IF;
    
    INSERT INTO public.project_phases (
      project_id,
      name,
      description,
      is_standard,
      position_rule,
      position_value
    ) VALUES (
      new_project_id,
      std_phase.phase_name,
      std_phase.phase_description,
      std_phase.phase_is_standard,
      std_phase.phase_position_rule,
      final_position_value  -- Already validated as INTEGER or NULL above
    ) RETURNING id INTO new_phase_id;
    
    RAISE NOTICE 'DEBUG: Successfully inserted phase: % (id: %)', std_phase.phase_name, new_phase_id;

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
        AND phase_id = std_phase.phase_id
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
'Creates a new project template with standard phases. Reads position_rule and sets position_value correctly.';

-- Step 3: Also fix create_project_revision_v2
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
  -- CRITICAL: Use UNION to completely separate first/last (no position_value) from nth (with position_value)
  -- This avoids reading position_value for first/last rules which may contain invalid data
  FOR source_phase IN
    SELECT 
      phase_id,
      phase_project_id,
      phase_name,
      phase_description,
      phase_is_standard,
      phase_position_rule,
      phase_position_value
    FROM (
      -- First: phases with first/last/last_minus_n rules - never read position_value
      SELECT 
        id AS phase_id,
        project_id AS phase_project_id,
        name AS phase_name,
        description AS phase_description,
        is_standard AS phase_is_standard,
        position_rule AS phase_position_rule,
        NULL::INTEGER AS phase_position_value,
        CASE 
          WHEN position_rule = 'first' THEN 1
          WHEN position_rule = 'last_minus_n' THEN 998
          WHEN position_rule = 'last' THEN 999
          ELSE 100
        END AS sort_order,
        CASE 
          WHEN position_rule = 'first' THEN 1
          WHEN position_rule = 'last_minus_n' THEN 998
          WHEN position_rule = 'last' THEN 999999
          ELSE 0
        END AS order_secondary
      FROM project_phases pp
      WHERE project_id = source_project_id
        AND position_rule IN ('first', 'last', 'last_minus_n')
      
      UNION ALL
      
      -- Second: phases with nth rule - read position_value with explicit INTEGER cast
      SELECT 
        id AS phase_id,
        project_id AS phase_project_id,
        name AS phase_name,
        description AS phase_description,
        is_standard AS phase_is_standard,
        position_rule AS phase_position_rule,
        CASE 
          WHEN position_value IS NULL THEN NULL::INTEGER
          ELSE position_value::INTEGER
        END AS phase_position_value,
        100 AS sort_order,
        COALESCE(position_value::INTEGER, 0) AS order_secondary
      FROM project_phases
      WHERE project_id = source_project_id
        AND position_rule = 'nth'
    ) AS phase_union
    ORDER BY sort_order, order_secondary
  LOOP
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
      source_phase.phase_name,
      source_phase.phase_description,
      source_phase.phase_is_standard,
      source_phase.phase_position_rule,
      -- Explicitly set NULL for first/last/last_minus_n, only use value for nth
      CASE 
        WHEN source_phase.phase_position_rule IN ('first', 'last', 'last_minus_n') THEN NULL::INTEGER
        WHEN source_phase.phase_position_rule = 'nth' AND source_phase.phase_position_value IS NOT NULL THEN source_phase.phase_position_value
        ELSE NULL::INTEGER
      END
    )
    RETURNING id INTO new_phase_id;

    -- Copy operations for this phase
    FOR source_operation IN
      SELECT * FROM template_operations
      WHERE phase_id = source_phase.phase_id
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
'Creates a new project revision. Reads position_rule and sets position_value correctly.';

COMMIT;

