-- Fix ambiguous column reference in create_project_revision_v2
-- The function parameter source_project_id conflicts with the new source_project_id column in project_phases
-- Solution: Use function name qualification for parameter references

BEGIN;

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
  WHERE id = create_project_revision_v2.source_project_id OR parent_project_id = create_project_revision_v2.source_project_id;

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
    create_project_revision_v2.source_project_id,
    new_revision_number,
    revision_notes_text
  FROM projects
  WHERE id = create_project_revision_v2.source_project_id
  RETURNING id INTO new_project_id;

  -- Copy phases
  -- CRITICAL: Use UNION to completely separate first/last (no position_value) from nth (with position_value)
  -- This avoids reading position_value for first/last rules which may contain invalid data
  -- Also include source_project_id and source_phase_id for incorporated phases
  FOR source_phase IN
    SELECT 
      phase_id,
      phase_project_id,
      phase_name,
      phase_description,
      phase_is_standard,
      phase_position_rule,
      phase_position_value,
      phase_source_project_id,
      phase_source_phase_id
    FROM (
      -- First: phases with first/last/last_minus_n rules - never read position_value
      SELECT 
        pp.id AS phase_id,
        pp.project_id AS phase_project_id,
        pp.name AS phase_name,
        pp.description AS phase_description,
        pp.is_standard AS phase_is_standard,
        pp.position_rule AS phase_position_rule,
        NULL::INTEGER AS phase_position_value,
        pp.source_project_id AS phase_source_project_id,
        pp.source_phase_id AS phase_source_phase_id,
        CASE 
          WHEN pp.position_rule = 'first' THEN 1
          WHEN pp.position_rule = 'last_minus_n' THEN 998
          WHEN pp.position_rule = 'last' THEN 999
          ELSE 100
        END AS sort_order,
        CASE 
          WHEN pp.position_rule = 'first' THEN 1
          WHEN pp.position_rule = 'last_minus_n' THEN 998
          WHEN pp.position_rule = 'last' THEN 999999
          ELSE 0
        END AS order_secondary
      FROM project_phases pp
      WHERE pp.project_id = create_project_revision_v2.source_project_id
        AND pp.position_rule IN ('first', 'last', 'last_minus_n')
      
      UNION ALL
      
      -- Second: phases with nth rule - read position_value with explicit INTEGER cast
      SELECT 
        pp.id AS phase_id,
        pp.project_id AS phase_project_id,
        pp.name AS phase_name,
        pp.description AS phase_description,
        pp.is_standard AS phase_is_standard,
        pp.position_rule AS phase_position_rule,
        CASE 
          WHEN pp.position_value IS NULL THEN NULL::INTEGER
          ELSE pp.position_value::INTEGER
        END AS phase_position_value,
        pp.source_project_id AS phase_source_project_id,
        pp.source_phase_id AS phase_source_phase_id,
        100 AS sort_order,
        COALESCE(pp.position_value::INTEGER, 0) AS order_secondary
      FROM project_phases pp
      WHERE pp.project_id = create_project_revision_v2.source_project_id
        AND pp.position_rule = 'nth'
    ) AS phase_union
    ORDER BY sort_order, order_secondary
  LOOP
    INSERT INTO project_phases (
      project_id,
      name,
      description,
      is_standard,
      position_rule,
      position_value,
      source_project_id,
      source_phase_id
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
      END,
      source_phase.phase_source_project_id,
      source_phase.phase_source_phase_id
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
'Creates a new project revision. Reads position_rule and sets position_value correctly. Includes source tracking for incorporated phases.';

COMMIT;

