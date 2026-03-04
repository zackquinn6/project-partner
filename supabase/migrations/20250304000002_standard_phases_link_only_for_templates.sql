-- =====================================================
-- Standard phases: link-only for templates, copies only for runs
-- - Templates get LINK rows to standard foundation (no duplicate phase_operations/operation_steps)
-- - Project runs get full resolved snapshot via create_project_run_snapshot (unchanged)
-- - rebuild_phases_json_from_project_phases resolves linked phases when building JSONB
-- =====================================================

-- 1. create_project_with_standard_foundation_v2: insert only phase LINK rows for standard phases (no copies)
DROP FUNCTION IF EXISTS public.create_project_with_standard_foundation_v2(TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  p_project_name TEXT,
  p_project_description TEXT,
  p_category TEXT DEFAULT 'general',
  p_created_by UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_id UUID;
  v_standard_project_id UUID;
  v_phase RECORD;
  category_array TEXT[];
  v_standard_name TEXT;
BEGIN
  category_array := ARRAY[COALESCE(p_category, 'general')];

  SELECT id, name INTO v_standard_project_id, v_standard_name
  FROM projects
  WHERE is_standard = true
  LIMIT 1;

  INSERT INTO projects (
    user_id,
    name,
    description,
    category,
    publish_status,
    is_template,
    is_current_version,
    created_at,
    updated_at
  ) VALUES (
    p_created_by,
    p_project_name,
    p_project_description,
    category_array,
    'draft',
    true,
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_project_id;

  -- Link to standard foundation only: insert phase rows with is_linked = true (no phase_operations/operation_steps copies)
  IF v_standard_project_id IS NOT NULL THEN
    FOR v_phase IN
      SELECT id, name, description, display_order, position_rule, position_value, is_standard, source_project_name
      FROM project_phases
      WHERE project_id = v_standard_project_id
      ORDER BY display_order
    LOOP
      INSERT INTO project_phases (
        project_id,
        name,
        description,
        display_order,
        position_rule,
        position_value,
        is_standard,
        is_linked,
        source_project_id,
        source_project_name,
        created_at,
        updated_at
      ) VALUES (
        v_project_id,
        v_phase.name,
        v_phase.description,
        v_phase.display_order,
        v_phase.position_rule,
        v_phase.position_value,
        v_phase.is_standard,
        true,
        v_standard_project_id,
        COALESCE(v_phase.source_project_name, v_standard_name),
        NOW(),
        NOW()
      );
    END LOOP;

    PERFORM public.rebuild_phases_json_from_project_phases(v_project_id);
    RAISE NOTICE 'Created project % with standard phases linked (no copies)', v_project_id;
  ELSE
    RAISE WARNING 'No standard project found - creating project without standard foundation';
  END IF;

  RETURN v_project_id;
END;
$$;

COMMENT ON FUNCTION public.create_project_with_standard_foundation_v2 IS
'Templates get LINK rows to standard foundation only. Standard phase copies are made only when creating project runs (create_project_run_snapshot).';

GRANT EXECUTE ON FUNCTION public.create_project_with_standard_foundation_v2(TEXT, TEXT, TEXT, UUID)
TO authenticated, service_role;


-- 2. rebuild_phases_json_from_project_phases: resolve linked phases from source when building JSONB
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(p_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_phases_jsonb JSONB;
BEGIN
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
        CASE
          WHEN pp.is_linked = true AND pp.source_project_id IS NOT NULL THEN
            (SELECT jsonb_agg(
              jsonb_build_object(
                'id', source_po.id,
                'name', source_po.operation_name,
                'description', source_po.operation_description,
                'estimatedTime', source_po.estimated_time,
                'flowType', COALESCE(source_po.flow_type, 'prime'),
                'steps', COALESCE(
                  (SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', source_os.id,
                      'step', source_os.step_title,
                      'description', source_os.description,
                      'contentType', COALESCE(source_os.content_type, 'text'),
                      'content', source_os.content,
                      'materials', COALESCE(source_os.materials, '[]'::jsonb),
                      'tools', COALESCE(source_os.tools, '[]'::jsonb),
                      'outputs', COALESCE(source_os.outputs, '[]'::jsonb),
                      'apps', COALESCE(source_os.apps, '[]'::jsonb),
                      'stepType', COALESCE(source_os.step_type, 'scaled'),
                      'flowType', COALESCE(source_os.flow_type, 'prime'),
                      'timeEstimation', CASE
                        WHEN source_os.time_estimate_low IS NOT NULL OR source_os.time_estimate_med IS NOT NULL OR source_os.time_estimate_high IS NOT NULL THEN
                          jsonb_build_object(
                            'variableTime', jsonb_build_object(
                              'low', COALESCE(source_os.time_estimate_low, 0),
                              'medium', COALESCE(source_os.time_estimate_med, 0),
                              'high', COALESCE(source_os.time_estimate_high, 0)
                            )
                          )
                        ELSE NULL
                      END,
                      'workersNeeded', COALESCE(source_os.number_of_workers, 1),
                      'skillLevel', source_os.skill_level,
                      'allowContentEdit', COALESCE(source_os.allow_content_edit, false)
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
            (SELECT jsonb_agg(
              jsonb_build_object(
                'id', po.id,
                'name', po.operation_name,
                'description', po.operation_description,
                'estimatedTime', po.estimated_time,
                'flowType', COALESCE(po.flow_type, 'prime'),
                'steps', COALESCE(
                  (SELECT jsonb_agg(
                    jsonb_build_object(
                      'id', os.id,
                      'step', os.step_title,
                      'description', os.description,
                      'contentType', COALESCE(os.content_type, 'text'),
                      'content', os.content,
                      'materials', COALESCE(os.materials, '[]'::jsonb),
                      'tools', COALESCE(os.tools, '[]'::jsonb),
                      'outputs', COALESCE(os.outputs, '[]'::jsonb),
                      'apps', COALESCE(os.apps, '[]'::jsonb),
                      'stepType', COALESCE(os.step_type, 'scaled'),
                      'flowType', COALESCE(os.flow_type, 'prime'),
                      'timeEstimation', CASE
                        WHEN os.time_estimate_low IS NOT NULL OR os.time_estimate_med IS NOT NULL OR os.time_estimate_high IS NOT NULL THEN
                          jsonb_build_object(
                            'variableTime', jsonb_build_object(
                              'low', COALESCE(os.time_estimate_low, 0),
                              'medium', COALESCE(os.time_estimate_med, 0),
                              'high', COALESCE(os.time_estimate_high, 0)
                            )
                          )
                        ELSE NULL
                      END,
                      'workersNeeded', COALESCE(os.number_of_workers, 1),
                      'skillLevel', os.skill_level,
                      'allowContentEdit', COALESCE(os.allow_content_edit, false)
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
  ) INTO v_phases_jsonb
  FROM project_phases pp
  WHERE pp.project_id = p_project_id;

  UPDATE projects
  SET phases = COALESCE(v_phases_jsonb, '[]'::jsonb),
      updated_at = NOW()
  WHERE id = p_project_id;

  RAISE NOTICE 'Rebuilt phases JSONB for project % with % phases',
    p_project_id,
    COALESCE(jsonb_array_length(v_phases_jsonb), 0);
END;
$$;

COMMENT ON FUNCTION public.rebuild_phases_json_from_project_phases IS
'Rebuilds phases JSONB from project_phases. Resolves linked phases (is_linked=true) from source_project_id so standard foundation content is included.';
