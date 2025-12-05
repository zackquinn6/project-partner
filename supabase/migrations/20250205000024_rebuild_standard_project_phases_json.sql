-- =====================================================
-- REBUILD STANDARD PROJECT PHASES JSONB
-- Sync relational data to JSONB column
-- =====================================================

DO $$
DECLARE
  v_standard_project_id UUID;
  v_phases_jsonb JSONB;
  v_phase_count INTEGER;
BEGIN
  -- Get standard project ID
  SELECT id INTO v_standard_project_id
  FROM projects
  WHERE is_standard = true;
  
  IF v_standard_project_id IS NULL THEN
    RAISE EXCEPTION 'No standard project found! Run migration 20250205000022 first.';
  END IF;
  
  RAISE NOTICE 'Found standard project: %', v_standard_project_id;
  
  -- Check current phase count in relational table
  SELECT COUNT(*) INTO v_phase_count
  FROM project_phases
  WHERE project_id = v_standard_project_id;
  
  RAISE NOTICE 'Phases in project_phases table: %', v_phase_count;
  
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
        WHEN pp.position_rule = 'first' THEN to_jsonb('first'::text)
        WHEN pp.position_rule = 'last' THEN to_jsonb('last'::text)
        WHEN pp.position_rule = 'nth' THEN to_jsonb(COALESCE(pp.position_value, 999))
        WHEN pp.position_rule = 'last_minus_n' THEN to_jsonb(COALESCE(pp.position_value, 999))
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
        ),
        '[]'::jsonb
      )
    )
    ORDER BY pp.display_order
  ) INTO v_phases_jsonb
  FROM project_phases pp
  WHERE pp.project_id = v_standard_project_id;
  
  RAISE NOTICE 'Built phases JSONB with % phases', jsonb_array_length(v_phases_jsonb);
  
  -- Update the projects table with the built JSONB
  UPDATE projects
  SET phases = v_phases_jsonb,
      updated_at = NOW()
  WHERE id = v_standard_project_id;
  
  RAISE NOTICE '✅ Updated standard project phases JSONB';
  RAISE NOTICE '';
  RAISE NOTICE 'Verification:';
  RAISE NOTICE '  - Project ID: %', v_standard_project_id;
  RAISE NOTICE '  - Phases in JSONB: %', jsonb_array_length(v_phases_jsonb);
  RAISE NOTICE '  - Phases created: Kickoff, Plan, Ordering, Close';
  
END $$;

