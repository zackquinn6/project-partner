-- =====================================================
-- CREATE REBUILD_PHASES_JSON_FROM_PROJECT_PHASES FUNCTION
-- This function rebuilds the phases JSONB field in the projects table
-- from the relational data in project_phases, phase_operations, and operation_steps
-- =====================================================

CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(p_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_phases_jsonb JSONB;
BEGIN
  -- Build complete phases JSONB from relational data
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
        WHEN pp.position_rule = 'last' THEN to_jsonb('last'::text)
        WHEN pp.position_rule = 'nth' THEN to_jsonb(COALESCE(pp.position_value, 999))
        ELSE to_jsonb(999)
      END,
      'operations', COALESCE(
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
        ),
        '[]'::jsonb
      )
    )
    ORDER BY pp.display_order
  ) INTO v_phases_jsonb
  FROM project_phases pp
  WHERE pp.project_id = p_project_id;
  
  -- Update the projects table with the built JSONB
  UPDATE projects
  SET phases = COALESCE(v_phases_jsonb, '[]'::jsonb),
      updated_at = NOW()
  WHERE id = p_project_id;
  
  RAISE NOTICE 'Rebuilt phases JSONB for project % with % phases', 
    p_project_id,
    COALESCE(jsonb_array_length(v_phases_jsonb), 0);
END;
$$;

COMMENT ON FUNCTION public.rebuild_phases_json_from_project_phases IS 'Rebuilds the phases JSONB field in the projects table from relational data in project_phases, phase_operations, and operation_steps tables.';

GRANT EXECUTE ON FUNCTION public.rebuild_phases_json_from_project_phases(UUID) 
TO authenticated, service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Created rebuild_phases_json_from_project_phases function';
END $$;

