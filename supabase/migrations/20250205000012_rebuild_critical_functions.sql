-- =====================================================
-- CRITICAL FUNCTIONS & VIEWS REBUILD
-- Date: 2025-12-05
-- =====================================================

-- =====================================================
-- VIEW: project_templates_live
-- Combines projects with their phases in JSONB format
-- =====================================================

CREATE OR REPLACE VIEW project_templates_live AS
SELECT 
  p.id,
  p.user_id,
  p.name,
  p.description,
  p.icon,
  p.difficulty_level,
  p.estimated_time,
  p.estimated_cost,
  p.visibility,
  p.is_template,
  p.is_standard,
  p.category,
  p.tags,
  p.created_at,
  p.updated_at,
  -- Build phases JSONB from relational project_phases table
  COALESCE(
    (
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
      )
      FROM project_phases pp
      WHERE pp.project_id = p.id
    ),
    '[]'::jsonb
  ) as phases
FROM projects p
WHERE p.is_template = true;

-- =====================================================
-- FUNCTION: create_project_run_snapshot
-- Creates an immutable snapshot of a project template
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

  -- Fetch template phases from project_templates_live view
  SELECT phases INTO v_template_phases
  FROM project_templates_live
  WHERE id = p_template_id::UUID;

  -- If no phases found in live templates, try projects.phases JSONB directly
  IF v_template_phases IS NULL THEN
    SELECT phases INTO v_template_phases
    FROM projects
    WHERE id = p_template_id::UUID;
  END IF;

  -- If still no phases, build from project_phases relational table
  IF v_template_phases IS NULL THEN
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
    ) INTO v_template_phases
    FROM project_phases pp
    WHERE pp.project_id = p_template_id::UUID;
  END IF;

  -- Validate phases exist
  IF v_template_phases IS NULL OR jsonb_array_length(v_template_phases) = 0 THEN
    RAISE EXCEPTION 'Template % has no phases. Cannot create project run without phases.', p_template_id;
  END IF;

  -- Create project run with complete phases snapshot
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
    v_template_phases,
    '[]'::jsonb,
    0,
    'active',
    NOW(),
    NOW(),
    'linear'
  )
  RETURNING id INTO v_run_id;

  -- Create default "Room 1" space for the project run
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
'Creates immutable snapshot of project template for a user. CRITICAL: Copies ALL phases including incorporated phases (isLinked: true) from template to run.';

-- =====================================================
-- FUNCTION: check_rate_limit
-- From security_functions migration
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  identifier TEXT,
  max_attempts INTEGER DEFAULT 5,
  window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  window_start := NOW() - (window_minutes || ' minutes')::INTERVAL;
  
  SELECT COUNT(*)
  INTO attempt_count
  FROM public.failed_login_attempts
  WHERE email = identifier
    AND attempt_time >= window_start;
  
  RETURN attempt_count < max_attempts;
END;
$$;

-- =====================================================
-- FUNCTION: log_failed_login
-- From security_functions migration
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_failed_login(
  user_email TEXT,
  ip_addr TEXT DEFAULT NULL,
  user_agent_string TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.failed_login_attempts (email, ip_address, user_agent)
  VALUES (user_email, ip_addr::INET, user_agent_string);
  
  -- Clean up old attempts (older than 24 hours)
  DELETE FROM public.failed_login_attempts
  WHERE attempt_time < NOW() - INTERVAL '24 hours';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_project_run_snapshot(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.log_failed_login(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Critical functions and views rebuild completed successfully';
END $$;

