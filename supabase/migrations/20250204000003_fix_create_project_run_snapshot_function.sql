-- Migration: Fix create_project_run_snapshot to copy incorporated phases
-- Date: 2025-12-04
-- Description: Update function to properly copy isLinked and source metadata in phases JSONB

-- Drop all existing function overloads using a DO block
-- This handles multiple function signatures safely
DO $$ 
DECLARE
  func_record RECORD;
BEGIN
  -- Loop through all overloads and drop each one by its specific signature
  FOR func_record IN 
    SELECT 
      oid::regprocedure AS func_signature
    FROM pg_proc 
    WHERE proname = 'create_project_run_snapshot'
      AND pg_function_is_visible(oid)
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', func_record.func_signature);
  END LOOP;
END $$;

-- Recreate function with incorporated phase support
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
  v_start_date TIMESTAMP;
  v_plan_end_date TIMESTAMP;
BEGIN
  -- Set default dates if not provided
  v_start_date := COALESCE(p_start_date::TIMESTAMP, NOW());
  v_plan_end_date := COALESCE(p_plan_end_date::TIMESTAMP, NOW() + INTERVAL '30 days');

  -- Fetch template phases from project_templates_live
  -- This JSONB already contains all phase metadata including incorporated phases
  SELECT phases INTO v_template_phases
  FROM project_templates_live
  WHERE id = p_template_id::UUID;

  -- If no phases found in live templates, try regular projects table
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
        'isLinked', COALESCE(pp.is_linked, false),  -- ← CRITICAL: Include incorporated flag
        'sourceProjectId', pp.source_project_id,    -- ← CRITICAL: Include source project
        'sourceProjectName', (SELECT name FROM projects WHERE id = pp.source_project_id),
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
    phases,  -- ← Complete JSONB including incorporated phases
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
    v_template_phases,  -- ← ALL phases including incorporated
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

-- Add comment
COMMENT ON FUNCTION create_project_run_snapshot IS 
'Creates immutable snapshot of project template for a user. CRITICAL: Copies ALL phases including incorporated phases (isLinked: true) from template to run.';

