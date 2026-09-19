-- Idempotent: project_run_planning_change_events (change register) + RLS.
-- Safe if the table already exists remotely without a local migration.

CREATE TABLE IF NOT EXISTS public.project_run_planning_change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_run_id uuid NOT NULL REFERENCES public.project_runs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  planning_tool text NOT NULL,
  change_summary text NOT NULL,
  change_detail jsonb
);

CREATE INDEX IF NOT EXISTS project_run_planning_change_events_run_occurred_idx
  ON public.project_run_planning_change_events (project_run_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS project_run_planning_change_events_tool_idx
  ON public.project_run_planning_change_events (planning_tool);

ALTER TABLE public.project_run_planning_change_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_run_planning_change_events_select_own
  ON public.project_run_planning_change_events;
CREATE POLICY project_run_planning_change_events_select_own
  ON public.project_run_planning_change_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_runs pr
      WHERE pr.id = project_run_planning_change_events.project_run_id
        AND pr.user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS project_run_planning_change_events_insert_own
  ON public.project_run_planning_change_events;
CREATE POLICY project_run_planning_change_events_insert_own
  ON public.project_run_planning_change_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_runs pr
      WHERE pr.id = project_run_planning_change_events.project_run_id
        AND pr.user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS project_run_planning_change_events_delete_own
  ON public.project_run_planning_change_events;
CREATE POLICY project_run_planning_change_events_delete_own
  ON public.project_run_planning_change_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_runs pr
      WHERE pr.id = project_run_planning_change_events.project_run_id
        AND pr.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Admin / owner analytics aggregate (respects is_admin + project_owners).
CREATE OR REPLACE FUNCTION public.get_planning_change_analytics_payload(
  p_project_ids uuid[] DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'events', '[]'::jsonb,
      'runs', '[]'::jsonb,
      'revisions', '[]'::jsonb
    );
  END IF;

  WITH visible_runs AS (
    SELECT pr.id, pr.project_id, pr.name, pr.status,
           pr.initial_timeline, pr.initial_budget, pr.first_schedule_finish_at,
           pr.schedule_events, pr.budget_data, pr.end_date, pr.planning_completed_at
    FROM public.project_runs pr
    WHERE (
      v_is_admin
      OR pr.user_id = v_uid
      OR EXISTS (
        SELECT 1
        FROM public.project_owners po
        WHERE po.user_id = v_uid
          AND po.invitation_status IS NULL
          AND (
            po.project_id = pr.project_id
            OR po.project_id = (
              SELECT p.parent_project_id FROM public.projects p WHERE p.id = pr.project_id
            )
            OR EXISTS (
              SELECT 1 FROM public.projects p
              WHERE p.id = pr.project_id AND p.parent_project_id = po.project_id
            )
          )
      )
    )
    AND (p_project_ids IS NULL OR pr.project_id = ANY (p_project_ids))
  ),
  events AS (
    SELECT e.id, e.project_run_id, e.occurred_at, e.planning_tool, e.change_summary
    FROM public.project_run_planning_change_events e
    INNER JOIN visible_runs vr ON vr.id = e.project_run_id
    WHERE (p_from IS NULL OR e.occurred_at >= p_from)
      AND (p_to IS NULL OR e.occurred_at <= p_to)
  ),
  revisions AS (
    SELECT r.project_run_id, r.finish_at, r.created_at, r.source
    FROM public.project_run_schedule_revisions r
    INNER JOIN visible_runs vr ON vr.id = r.project_run_id
  )
  SELECT jsonb_build_object(
    'events', COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.occurred_at DESC) FROM events e), '[]'::jsonb),
    'runs', COALESCE((SELECT jsonb_agg(to_jsonb(vr)) FROM visible_runs vr), '[]'::jsonb),
    'revisions', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM revisions r), '[]'::jsonb)
  )
  INTO v_result;

  RETURN COALESCE(v_result, jsonb_build_object('events', '[]'::jsonb, 'runs', '[]'::jsonb, 'revisions', '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.get_planning_change_analytics_payload(uuid[], timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_planning_change_analytics_payload(uuid[], timestamptz, timestamptz) TO authenticated;
