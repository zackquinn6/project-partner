-- =====================================================
-- REMOVE HARDCODED PHASE NAME FALLBACK
-- Always use is_standard field directly, never hardcode phase names
-- =====================================================

-- Update create_project_run_snapshot to remove hardcoded phase name fallback
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
  -- CRITICAL: Always use is_standard field directly - never hardcode phase names
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
    v_template_phases, -- RESOLVED snapshot - links are dereferenced, isStandard from is_standard field only
    '[]'::jsonb,
    0,
    'active',
    NOW(),
    NOW(),
    'linear'
  )
  RETURNING id::TEXT INTO v_run_id;

  -- Copy template risks to project run
  PERFORM copy_template_risks_to_project_run(p_template_id::UUID, v_run_id::UUID);

  RETURN v_run_id;
END;
$$;

COMMENT ON FUNCTION create_project_run_snapshot IS 'Creates an immutable project run snapshot with complete phases JSONB. Always uses is_standard database field directly - never hardcodes phase names.';

-- Update the UPDATE statement to use source_project_id instead of hardcoded names
UPDATE public.project_phases pp
SET is_standard = true
FROM public.projects p
WHERE pp.project_id = p.id
  AND p.is_standard = false  -- Only update non-standard projects
  AND pp.source_project_id = (SELECT id FROM public.projects WHERE is_standard = true LIMIT 1)
  AND (pp.is_standard IS NULL OR pp.is_standard = false);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Removed hardcoded phase name fallback - now always uses is_standard field directly';
END $$;

