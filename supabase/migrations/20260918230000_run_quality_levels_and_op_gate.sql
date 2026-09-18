-- Dual-axis follow-up: emit op minQualityGoal in phases JSON; snapshot quality
-- impact rows onto project runs at create time.

-- ---------------------------------------------------------------------------
-- rebuild: include minQualityGoal on operations (linked phases resolve source ops)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases_internal(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  phases_json jsonb := '[]'::jsonb;
  phase_record RECORD;
  operations_json jsonb;
  op_record RECORD;
  steps_json jsonb;
  ops_phase_id uuid;
BEGIN
  FOR phase_record IN
    SELECT
      id,
      project_id,
      name,
      description,
      is_standard,
      is_linked,
      source_project_id,
      source_phase_id,
      position_rule,
      position_value,
      created_at
    FROM public.project_phases
    WHERE project_id = p_project_id
    ORDER BY
      CASE
        WHEN position_rule = 'nth' THEN COALESCE(position_value, 999)
        WHEN position_rule = 'last' THEN 2147483647
        ELSE 999
      END ASC,
      created_at ASC
  LOOP
    ops_phase_id := COALESCE(phase_record.source_phase_id, phase_record.id);
    operations_json := '[]'::jsonb;

    FOR op_record IN
      SELECT
        id,
        phase_id,
        operation_name,
        operation_description,
        flow_type,
        display_order,
        min_quality_goal
      FROM public.phase_operations
      WHERE phase_id = ops_phase_id
      ORDER BY display_order ASC
    LOOP
      steps_json := public.get_operation_steps_json(op_record.id, false);
      operations_json := operations_json || jsonb_build_array(
        jsonb_build_object(
          'id', op_record.id,
          'name', op_record.operation_name,
          'description', op_record.operation_description,
          'flowType', COALESCE(op_record.flow_type, 'prime'),
          'minQualityGoal', op_record.min_quality_goal,
          'steps', COALESCE(steps_json, '[]'::jsonb),
          'isStandard', phase_record.is_standard
        )
      );
    END LOOP;

    phases_json := phases_json || jsonb_build_array(
      jsonb_build_object(
        'id', phase_record.id,
        'name', phase_record.name,
        'description', phase_record.description,
        'operations', COALESCE(operations_json, '[]'::jsonb),
        'isStandard', phase_record.is_standard,
        'isLinked', COALESCE(phase_record.is_linked, phase_record.source_project_id IS NOT NULL),
        'sourceProjectId', phase_record.source_project_id,
        'sourcePhaseId', phase_record.source_phase_id,
        'phaseOrderNumber',
          CASE
            WHEN phase_record.position_rule = 'last' THEN '"last"'::jsonb
            WHEN phase_record.position_rule = 'nth' AND phase_record.position_value IS NOT NULL
              THEN to_jsonb(phase_record.position_value)
            ELSE to_jsonb(999)
          END,
        'position_rule', phase_record.position_rule,
        'position_value', phase_record.position_value
      )
    );
  END LOOP;

  RETURN COALESCE(phases_json, '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- project_run_quality_levels: frozen impact copy for the run
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_run_quality_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id uuid NOT NULL REFERENCES public.project_runs (id) ON DELETE CASCADE,
  source_project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  source_project_name text NOT NULL,
  quality_level text NOT NULL,
  outcome_summary text NOT NULL,
  process_summary text NOT NULL,
  vs_lower_summary text,
  example_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_run_quality_levels_quality_level_check
    CHECK (quality_level IN ('good', 'great', 'professional')),
  CONSTRAINT project_run_quality_levels_example_image_urls_is_array
    CHECK (jsonb_typeof(example_image_urls) = 'array'),
  CONSTRAINT project_run_quality_levels_run_source_level_unique
    UNIQUE (project_run_id, source_project_id, quality_level)
);

CREATE INDEX IF NOT EXISTS project_run_quality_levels_run_id_idx
  ON public.project_run_quality_levels (project_run_id);

ALTER TABLE public.project_run_quality_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_run_quality_levels_select_own ON public.project_run_quality_levels;
CREATE POLICY project_run_quality_levels_select_own ON public.project_run_quality_levels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_runs pr
      WHERE pr.id = project_run_quality_levels.project_run_id
        AND pr.user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS project_run_quality_levels_insert_own ON public.project_run_quality_levels;
CREATE POLICY project_run_quality_levels_insert_own ON public.project_run_quality_levels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_runs pr
      WHERE pr.id = project_run_quality_levels.project_run_id
        AND pr.user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS project_run_quality_levels_delete_own ON public.project_run_quality_levels;
CREATE POLICY project_run_quality_levels_delete_own ON public.project_run_quality_levels
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_runs pr
      WHERE pr.id = project_run_quality_levels.project_run_id
        AND pr.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Copy host + distinct adopted source project quality levels onto a run.
CREATE OR REPLACE FUNCTION public.copy_project_quality_levels_to_run(p_run_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_host_project_id uuid;
  v_source_ids uuid[];
  v_inserted integer := 0;
BEGIN
  SELECT project_id INTO v_host_project_id
  FROM public.project_runs
  WHERE id = p_run_id;

  IF v_host_project_id IS NULL THEN
    RAISE EXCEPTION 'copy_project_quality_levels_to_run: run % not found or missing project_id', p_run_id;
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT x.source_id
    FROM (
      SELECT v_host_project_id AS source_id
      UNION ALL
      SELECT (phase.value->>'sourceProjectId')::uuid
      FROM public.project_runs pr
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(pr.phases, '[]'::jsonb)) AS phase(value)
      WHERE pr.id = p_run_id
        AND phase.value->>'sourceProjectId' IS NOT NULL
        AND phase.value->>'sourceProjectId' ~ '^[0-9a-fA-F-]{36}$'
    ) x
    WHERE x.source_id IS NOT NULL
  )
  INTO v_source_ids;

  DELETE FROM public.project_run_quality_levels WHERE project_run_id = p_run_id;

  INSERT INTO public.project_run_quality_levels (
    project_run_id,
    source_project_id,
    source_project_name,
    quality_level,
    outcome_summary,
    process_summary,
    vs_lower_summary,
    example_image_urls
  )
  SELECT
    p_run_id,
    pql.project_id,
    COALESCE(p.name, pql.project_id::text),
    pql.quality_level,
    pql.outcome_summary,
    pql.process_summary,
    pql.vs_lower_summary,
    pql.example_image_urls
  FROM public.project_quality_levels pql
  JOIN public.projects p ON p.id = pql.project_id
  WHERE pql.project_id = ANY (v_source_ids);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.copy_project_quality_levels_to_run(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.copy_project_quality_levels_to_run(uuid) TO authenticated, service_role;
