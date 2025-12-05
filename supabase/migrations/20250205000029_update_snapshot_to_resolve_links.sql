-- =====================================================
-- UPDATE CREATE_PROJECT_RUN_SNAPSHOT
-- Resolve dynamic links when creating immutable snapshots
-- =====================================================

CREATE OR REPLACE FUNCTION create_project_run_snapshot(
  p_template_id TEXT,
  p_user_id TEXT,
  p_run_name TEXT,
  p_home_id TEXT DEFAULT NULL,
  p_start_date TEXT DEFAULT NULL,
  p_plan_end_date TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run_id TEXT;
  v_template_phases JSONB;
  v_start_date TIMESTAMPTZ;
  v_plan_end_date TIMESTAMPTZ;
BEGIN
  -- Set default dates if not provided
  v_start_date := COALESCE(p_start_date::TIMESTAMPTZ, NOW());
  v_plan_end_date := COALESCE(p_plan_end_date::TIMESTAMPTZ, NOW() + INTERVAL '30 days');

  -- Build complete phases JSONB from relational data
  -- CRITICAL: Resolve dynamic links by fetching operations from source_project_id
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pp.id,
      'name', pp.name,
      'description', pp.description,
      'isStandard', COALESCE(pp.is_standard, false),
      'isLinked', COALESCE(pp.is_linked, false),
      'sourceProjectId', pp.source_project_id,
      'sourceProjectName', pp.source_project_name,
      'phaseOrderNumber', CASE
        WHEN pp.position_rule = 'first' THEN to_jsonb('first'::text)
        WHEN pp.position_rule = 'last' THEN to_jsonb('last'::text)
        WHEN pp.position_rule = 'nth' THEN to_jsonb(COALESCE(pp.position_value, 999))
        WHEN pp.position_rule = 'last_minus_n' THEN to_jsonb(COALESCE(pp.position_value, 999))
        ELSE to_jsonb(999)
      END,
      'operations', COALESCE(
        -- If linked phase, fetch operations from SOURCE project
        CASE WHEN pp.is_linked = true AND pp.source_project_id IS NOT NULL THEN
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', source_po.id,
                'name', source_po.operation_name,
                'description', source_po.operation_description,
                'estimatedTime', source_po.estimated_time,
                'flowType', COALESCE(source_po.flow_type, 'prime'),
                'steps', COALESCE(
                  (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'id', source_os.id,
                        'step', source_os.step_title,
                        'description', source_os.description,
                        'contentType', COALESCE(source_os.content_type, 'text'),
                        'content', source_os.content,
                        'materials', COALESCE(source_os.materials, '[]'::jsonb),
                        'tools', COALESCE(source_os.tools, '[]'::jsonb),
                        'outputs', COALESCE(source_os.outputs, '[]'::jsonb)
                      )
                      ORDER BY source_os.display_order
                    )
                    FROM operation_steps source_os
                    WHERE source_os.operation_id = source_po.id
                  ),
                  '[]'::jsonb
                )
              )
              ORDER BY source_po.display_order
            )
            FROM phase_operations source_po
            JOIN project_phases source_pp ON source_pp.id = source_po.phase_id
            WHERE source_pp.project_id = pp.source_project_id
              AND source_pp.name = pp.name
          )
        ELSE
          -- If not linked, get operations from this phase directly
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', po.id,
                'name', po.operation_name,
                'description', po.operation_description,
                'estimatedTime', po.estimated_time,
                'flowType', COALESCE(po.flow_type, 'prime'),
                'steps', COALESCE(
                  (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'id', os.id,
                        'step', os.step_title,
                        'description', os.description,
                        'contentType', COALESCE(os.content_type, 'text'),
                        'content', os.content,
                        'materials', COALESCE(os.materials, '[]'::jsonb),
                        'tools', COALESCE(os.tools, '[]'::jsonb),
                        'outputs', COALESCE(os.outputs, '[]'::jsonb)
                      )
                      ORDER BY os.display_order
                    )
                    FROM operation_steps os
                    WHERE os.operation_id = po.id
                  ),
                  '[]'::jsonb
                )
              )
              ORDER BY po.display_order
            )
            FROM phase_operations po
            WHERE po.phase_id = pp.id
          )
        END,
        '[]'::jsonb
      )
    )
    ORDER BY pp.display_order
  ) INTO v_template_phases
  FROM project_phases pp
  WHERE pp.project_id = p_template_id::UUID;

  -- Validate phases exist
  IF v_template_phases IS NULL OR jsonb_array_length(v_template_phases) = 0 THEN
    RAISE EXCEPTION 'Template % has no phases. Cannot create project run without phases.', p_template_id;
  END IF;

  -- Create project run with complete RESOLVED phases snapshot
  INSERT INTO project_runs (
    user_id,
    template_id,
    name,
    home_id,
    start_date,
    plan_end_date,
    phases,
    completed_steps,
    progress,
    status,
    created_at,
    updated_at,
    progress_reporting_style
  ) VALUES (
    p_user_id::UUID,
    p_template_id::UUID,
    p_run_name,
    CASE WHEN p_home_id IS NOT NULL AND p_home_id != '' THEN p_home_id::UUID ELSE NULL END,
    v_start_date,
    v_plan_end_date,
    v_template_phases, -- RESOLVED snapshot - links are dereferenced
    '[]'::jsonb,
    0,
    'active',
    NOW(),
    NOW(),
    'linear'
  )
  RETURNING id INTO v_run_id;

  -- Create default "Room 1" space
  INSERT INTO project_run_spaces (
    project_run_id,
    space_name,
    space_type,
    priority,
    created_at
  ) VALUES (
    v_run_id::UUID,
    'Room 1',
    'room',
    1,
    NOW()
  );

  RETURN v_run_id;
END;
$$;

COMMENT ON FUNCTION create_project_run_snapshot IS 
'Creates IMMUTABLE snapshot of project template. CRITICAL: Resolves dynamic links (isLinked: true) by fetching operations/steps from source_project_id. The snapshot contains fully resolved data at the moment of creation - it will NOT change if the standard project is later updated.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ create_project_run_snapshot updated with dynamic link resolution';
  RAISE NOTICE '✅ Project runs now contain fully resolved snapshots';
  RAISE NOTICE '';
  RAISE NOTICE '📋 How dynamic linking works:';
  RAISE NOTICE '  1. Templates: Phases with isLinked=true reference standard project';
  RAISE NOTICE '  2. View: project_templates_live resolves links dynamically';
  RAISE NOTICE '  3. Snapshots: create_project_run_snapshot resolves links once';
  RAISE NOTICE '  4. Runs: project_runs contain immutable resolved data';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Standard foundation updates automatically propagate to templates';
  RAISE NOTICE '✅ Existing project runs remain unchanged (immutable snapshots)';
END $$;

