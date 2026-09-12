-- Admin-only beta tile analytics payload (signups + tile project_runs with AAR flag).
-- Keeps success/started definitions in the app (src/utils/betaMetrics.ts).

CREATE OR REPLACE FUNCTION public.get_beta_tile_analytics_payload(
  p_signup_from timestamptz,
  p_signup_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_signups bigint;
  v_runs jsonb;
BEGIN
  IF NOT public.is_caller_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COUNT(*)::bigint
  INTO v_signups
  FROM public.user_profiles up
  WHERE up.created_at >= p_signup_from
    AND up.created_at < p_signup_to;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at), '[]'::jsonb)
  INTO v_runs
  FROM (
    SELECT
      pr.id,
      pr.user_id,
      pr.project_id,
      pr.name,
      pr.category,
      pr.status,
      pr.created_at,
      pr.updated_at,
      pr.start_date,
      pr.end_date,
      pr.completed_steps,
      pr.phase_ratings,
      pr.project_photos,
      EXISTS (
        SELECT 1
        FROM public.after_action_reviews aar
        WHERE aar.project_run_id = pr.id
      ) AS has_aar
    FROM public.project_runs pr
    LEFT JOIN public.projects p ON p.id = pr.project_id
    WHERE
      lower(coalesce(pr.name, '')) LIKE '%tile%'
      OR lower(coalesce(pr.category, '')) LIKE '%tile%'
      OR lower(coalesce(p.name, '')) LIKE '%tile%'
      OR EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.category, ARRAY[]::text[])) AS cat(name)
        WHERE lower(cat.name) = 'tile'
      )
  ) t;

  RETURN jsonb_build_object(
    'signups', v_signups,
    'runs', COALESCE(v_runs, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_beta_tile_analytics_payload(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_beta_tile_analytics_payload(timestamptz, timestamptz) TO authenticated;
