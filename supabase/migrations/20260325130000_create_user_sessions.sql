-- Session log for end-user sign-ins (Auth.tsx insert, SecurityDashboard, securityUtils metrics).
-- Fixes PostgREST PGRST205: Could not find the table 'public.user_sessions'.

CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_start timestamptz NOT NULL DEFAULT now(),
  session_end timestamptz,
  ip_address inet,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX user_sessions_user_id_idx ON public.user_sessions (user_id);
CREATE INDEX user_sessions_session_start_idx ON public.user_sessions (session_start DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_sessions_insert_own
  ON public.user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_sessions_select_visible
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.roles IS NOT NULL
        AND up.roles::jsonb @> '["admin"]'::jsonb
    )
  );

CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
  is_admin_user boolean;
BEGIN
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.roles IS NOT NULL
        AND up.roles::jsonb @> '["admin"]'::jsonb
    )
  INTO is_admin_user;

  IF auth.uid() IS NULL OR NOT is_admin_user THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_sessions
  WHERE session_start < now() - interval '90 days';

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN coalesce(n, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_sessions() TO authenticated;

COMMENT ON TABLE public.user_sessions IS 'Per-login session rows for security metrics and admin dashboard.';
