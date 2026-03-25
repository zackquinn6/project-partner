-- Lock down security/audit tables (admin read/write via client; service_role and SECURITY DEFINER still bypass RLS).
-- Harden user_profiles: RLS + forbid non-admins from persisting rows whose roles include 'admin' (defense in depth with tr_user_profiles_roles_guard).

-- ---------------------------------------------------------------------------
-- Admin-only tables: SELECT/INSERT/UPDATE/DELETE for authenticated admins only.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  r record;
  p_select text;
  p_insert text;
  p_update text;
  p_delete text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'role_audit_log',
    'admin_sessions',
    'admin_sensitive_data_access',
    'security_events',
    'user_roles'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR r IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;
    p_select := t || '_select_admin';
    p_insert := t || '_insert_admin';
    p_update := t || '_update_admin';
    p_delete := t || '_delete_admin';
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_admin(auth.uid()))',
      p_select, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()))',
      p_insert, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))',
      p_update, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin(auth.uid()))',
      p_delete, t
    );
  END LOOP;

  -- failed_login_attempts: rows are written by SECURITY DEFINER RPC (e.g. log_failed_login), not by clients.
  t := 'failed_login_attempts';
  IF to_regclass('public.failed_login_attempts') IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR r IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;
    EXECUTE
      'CREATE POLICY failed_login_attempts_select_admin ON public.failed_login_attempts
        FOR SELECT TO authenticated
        USING (public.is_admin(auth.uid()))';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- user_profiles: own-row access; admins see/manage all; block self-granted admin role.
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', r.policyname);
  END LOOP;
END $$;

CREATE POLICY user_profiles_select_own_or_admin
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY user_profiles_insert_own
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.is_admin(auth.uid())
      OR roles IS NULL
      OR NOT ('admin' = ANY (roles))
    )
  );

CREATE POLICY user_profiles_update_own
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.is_admin(auth.uid())
      OR roles IS NULL
      OR NOT ('admin' = ANY (roles))
    )
  );

CREATE POLICY user_profiles_update_admin
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY user_profiles_delete_admin
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
