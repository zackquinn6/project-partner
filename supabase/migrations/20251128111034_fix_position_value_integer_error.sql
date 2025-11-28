-- Migration: Fix position_value integer error
-- The position_value column is INTEGER, so it must be NULL when position_rule is 'first' or 'last'
-- This fixes the error: invalid input syntax for type integer: "last"

BEGIN;

-- Step 1: Fix any existing bad data in project_phases
-- Set position_value to NULL when position_rule is 'first' or 'last'
UPDATE public.project_phases
SET position_value = NULL
WHERE position_rule IN ('first', 'last')
  AND position_value IS NOT NULL;

-- Also fix any cases where position_value might be a string representation
UPDATE public.project_phases
SET position_value = NULL
WHERE position_rule IN ('first', 'last')
  AND position_value::text IN ('first', 'last', 'First', 'Last');

-- Step 2: Fix create_project_with_standard_foundation_v2 function
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
  FOR std_phase IN
    SELECT 
      id,
      project_id,
      name,
      description,
      is_standard,
      position_rule,
      position_value
    FROM public.project_phases
    WHERE project_id = standard_project_id
    ORDER BY 
      CASE 
        WHEN position_rule = 'first' THEN 0
        WHEN position_rule = 'last' THEN 999999
        WHEN position_rule = 'nth' AND position_value IS NOT NULL THEN position_value
        ELSE 999998
      END
  LOOP
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
      -- CRITICAL: position_value must be NULL for 'first' and 'last', INTEGER for 'nth'
      CASE 
        WHEN std_phase.position_rule IN ('first', 'last') THEN NULL
        WHEN std_phase.position_rule = 'nth' THEN std_phase.position_value
        ELSE NULL
      END
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
'Creates a new project template with standard phases. Fixed position_value handling - must be NULL for first/last rules.';

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
  FOR source_phase IN
    SELECT 
      id,
      project_id,
      name,
      description,
      is_standard,
      position_rule,
      position_value
    FROM project_phases
    WHERE project_id = source_project_id
    ORDER BY 
      CASE 
        WHEN position_rule = 'first' THEN 0
        WHEN position_rule = 'last' THEN 999999
        WHEN position_rule = 'nth' AND position_value IS NOT NULL THEN position_value
        ELSE 999998
      END
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
      source_phase.name,
      source_phase.description,
      source_phase.is_standard,
      source_phase.position_rule,
      -- CRITICAL: position_value must be NULL for 'first' and 'last', INTEGER for 'nth'
      CASE 
        WHEN source_phase.position_rule IN ('first', 'last') THEN NULL
        WHEN source_phase.position_rule = 'nth' THEN source_phase.position_value
        ELSE NULL
      END
    )
    RETURNING id INTO new_phase_id;

    -- Copy operations for this phase
    FOR source_operation IN
      SELECT * FROM template_operations
      WHERE phase_id = source_phase.id
      ORDER BY display_order
    LOOP
      INSERT INTO template_operations (
        phase_id,
        project_id,
        operation_name,
        operation_description,
        flow_type,
        is_reference,
        source_operation_id,
        display_order
      )
      VALUES (
        new_phase_id,
        new_project_id,
        source_operation.operation_name,
        source_operation.operation_description,
        source_operation.flow_type,
        source_operation.is_reference,
        source_operation.source_operation_id,
        source_operation.display_order
      )
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
'Creates a new revision of a project. Fixed position_value handling - must be NULL for first/last rules.';

COMMIT;

-- Verify the fix
DO $$
DECLARE
  bad_phases_count INTEGER;
BEGIN
  -- Check for any remaining bad data
  SELECT COUNT(*) INTO bad_phases_count
  FROM public.project_phases
  WHERE position_rule IN ('first', 'last')
    AND position_value IS NOT NULL;
  
  IF bad_phases_count > 0 THEN
    RAISE WARNING 'Found % phases with position_rule first/last but non-NULL position_value', bad_phases_count;
  ELSE
    RAISE NOTICE '✅ All phases have correct position_value (NULL for first/last rules)';
  END IF;
  
  RAISE NOTICE '✅ Functions updated to handle position_value correctly';
END $$;

