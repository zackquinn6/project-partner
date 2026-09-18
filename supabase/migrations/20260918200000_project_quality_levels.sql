-- Quality goal impacts: project_quality_levels + min_quality_goal on steps/ops.
-- Carry minQualityGoal through phases JSON via get_operation_steps_json.
-- Guarded initial_quality_goal for fresh environments (do not restore deleted migrations).

-- ---------------------------------------------------------------------------
-- project_runs.initial_quality_goal (idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_runs
  ADD COLUMN IF NOT EXISTS initial_quality_goal text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_runs_initial_quality_goal_check'
      AND conrelid = 'public.project_runs'::regclass
  ) THEN
    ALTER TABLE public.project_runs
      ADD CONSTRAINT project_runs_initial_quality_goal_check
      CHECK (
        initial_quality_goal IS NULL
        OR initial_quality_goal IN ('good', 'great', 'professional')
      );
  END IF;
END
$$;

ALTER TABLE public.project_runs
  ALTER COLUMN initial_quality_goal SET DEFAULT 'great';

UPDATE public.project_runs
SET initial_quality_goal = 'great'
WHERE initial_quality_goal IS NULL;

-- ---------------------------------------------------------------------------
-- operation_steps / phase_operations.min_quality_goal
-- ---------------------------------------------------------------------------
ALTER TABLE public.operation_steps
  ADD COLUMN IF NOT EXISTS min_quality_goal text;

ALTER TABLE public.phase_operations
  ADD COLUMN IF NOT EXISTS min_quality_goal text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'operation_steps_min_quality_goal_check'
      AND conrelid = 'public.operation_steps'::regclass
  ) THEN
    ALTER TABLE public.operation_steps
      ADD CONSTRAINT operation_steps_min_quality_goal_check
      CHECK (
        min_quality_goal IS NULL
        OR min_quality_goal IN ('great', 'professional')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'phase_operations_min_quality_goal_check'
      AND conrelid = 'public.phase_operations'::regclass
  ) THEN
    ALTER TABLE public.phase_operations
      ADD CONSTRAINT phase_operations_min_quality_goal_check
      CHECK (
        min_quality_goal IS NULL
        OR min_quality_goal IN ('great', 'professional')
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.operation_steps.min_quality_goal IS
  'NULL = all quality goals; great = Great+Professional; professional = Professional only.';

COMMENT ON COLUMN public.phase_operations.min_quality_goal IS
  'NULL = all quality goals; great = Great+Professional; professional = Professional only.';

-- ---------------------------------------------------------------------------
-- project_quality_levels
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_quality_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  quality_level text NOT NULL,
  outcome_summary text NOT NULL,
  process_summary text NOT NULL,
  vs_lower_summary text,
  example_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_quality_levels_quality_level_check
    CHECK (quality_level IN ('good', 'great', 'professional')),
  CONSTRAINT project_quality_levels_vs_lower_check
    CHECK (
      (quality_level = 'good' AND vs_lower_summary IS NULL)
      OR (quality_level <> 'good' AND vs_lower_summary IS NOT NULL)
    ),
  CONSTRAINT project_quality_levels_example_image_urls_is_array
    CHECK (jsonb_typeof(example_image_urls) = 'array'),
  CONSTRAINT project_quality_levels_project_level_unique
    UNIQUE (project_id, quality_level)
);

CREATE INDEX IF NOT EXISTS project_quality_levels_project_id_idx
  ON public.project_quality_levels (project_id);

ALTER TABLE public.project_quality_levels ENABLE ROW LEVEL SECURITY;

-- Read: same catalog visibility as template risk authoring (admin, owner, published/beta, foundation).
DROP POLICY IF EXISTS project_quality_levels_select_authenticated ON public.project_quality_levels;
CREATE POLICY project_quality_levels_select_authenticated ON public.project_quality_levels
  FOR SELECT
  TO authenticated
  USING (public.can_caller_read_template_risk_authoring(project_id) IS TRUE);

DROP POLICY IF EXISTS project_quality_levels_insert_editors ON public.project_quality_levels;
CREATE POLICY project_quality_levels_insert_editors ON public.project_quality_levels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_quality_levels.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_owners po
      WHERE po.project_id = project_quality_levels.project_id
        AND po.user_id = auth.uid()
        AND po.invitation_status IS NULL
    )
  );

DROP POLICY IF EXISTS project_quality_levels_update_editors ON public.project_quality_levels;
CREATE POLICY project_quality_levels_update_editors ON public.project_quality_levels
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_quality_levels.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_owners po
      WHERE po.project_id = project_quality_levels.project_id
        AND po.user_id = auth.uid()
        AND po.invitation_status IS NULL
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_quality_levels.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_owners po
      WHERE po.project_id = project_quality_levels.project_id
        AND po.user_id = auth.uid()
        AND po.invitation_status IS NULL
    )
  );

DROP POLICY IF EXISTS project_quality_levels_delete_editors ON public.project_quality_levels;
CREATE POLICY project_quality_levels_delete_editors ON public.project_quality_levels
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_quality_levels.project_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_owners po
      WHERE po.project_id = project_quality_levels.project_id
        AND po.user_id = auth.uid()
        AND po.invitation_status IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- Snapshot JSON: include minQualityGoal on each step
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_operation_steps_json(
  p_operation_id uuid,
  p_is_reference boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  steps_json jsonb;
BEGIN
  SELECT COALESCE(
    (
      SELECT jsonb_agg(step_obj)
      FROM (
        SELECT jsonb_build_object(
          'id', s.id,
          'step', s.step_title,
          'description', s.description,
          'stepType', s.step_type,
          'flowType', s.flow_type,
          'minQualityGoal', s.min_quality_goal,
          'timeEstimateLow', s.time_estimate_low,
          'timeEstimateMedium', s.time_estimate_med,
          'timeEstimateHigh', s.time_estimate_high,
          'materials', s.materials,
          'tools', s.tools,
          'apps', s.apps,
          'outputs', s.outputs,
          'processVariables', s.process_variables,
          'displayOrder', s.display_order,
          'allowContentEdit', s.allow_content_edit,
          'skillLevel', s.skill_level,
          'numberOfWorkers', s.number_of_workers
        ) AS step_obj
        FROM public.operation_steps s
        WHERE s.operation_id = p_operation_id
        ORDER BY s.display_order NULLS LAST, s.created_at
      ) ordered_rows
    ),
    '[]'::jsonb
  )
  INTO steps_json;

  RETURN steps_json;
END;
$$;
