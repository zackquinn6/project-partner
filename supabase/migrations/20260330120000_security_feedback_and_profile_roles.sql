-- 0) is_admin(check_user_id): true when user_profiles.roles contains 'admin'.
--    SECURITY DEFINER so RLS policies and triggers can evaluate admin without circular RLS.
--    Matches PostgREST RPC is_admin({ check_user_id }).

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT 'admin' = ANY (COALESCE(up.roles, ARRAY[]::text[]))
      FROM public.user_profiles up
      WHERE up.user_id = check_user_id
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;

-- 1) Feedback: restrict reads/updates to admins; allow authenticated insert for own rows only.
--    Prevents unauthenticated listing of user_email / user_name.

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'feedback'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.feedback', r.policyname);
  END LOOP;
END $$;

CREATE POLICY feedback_insert_authenticated_own
  ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY feedback_select_admin_only
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY feedback_update_admin_only
  ON public.feedback
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY feedback_delete_admin_only
  ON public.feedback
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2) user_profiles.roles: block direct client changes except admins or guarded RPC path.

CREATE OR REPLACE FUNCTION public.user_profiles_enforce_role_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
      NEW.roles := ARRAY['user']::text[];
    ELSE
      NEW.roles := COALESCE(NEW.roles, ARRAY['user']::text[]);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.roles IS DISTINCT FROM OLD.roles THEN
      IF auth.uid() IS NOT NULL AND public.is_admin(auth.uid()) THEN
        RETURN NEW;
      END IF;
      IF current_setting('app.profile_roles_ok', true) = '1' THEN
        RETURN NEW;
      END IF;
      IF auth.uid() IS NULL THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Changing user_profiles.roles is not allowed from this client'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS tr_user_profiles_roles_guard ON public.user_profiles;
CREATE TRIGGER tr_user_profiles_roles_guard
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.user_profiles_enforce_role_immutability();

-- Atomic, validated project-owner acceptance (replaces direct client updates to roles).

CREATE OR REPLACE FUNCTION public.complete_project_owner_invitation(
  p_invitation_id uuid,
  p_terms_version text DEFAULT '1.0',
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  uid uuid := auth.uid();
  jwt_email text;
  inv record;
  new_roles text[];
  ver text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  jwt_email := nullif(lower(trim(auth.jwt() ->> 'email')), '');

  SELECT * INTO inv
  FROM public.project_owner_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF inv.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Invitation is not pending';
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  IF inv.invited_user_id IS NOT NULL AND inv.invited_user_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'Invitation is for another user';
  END IF;

  IF inv.invited_user_id IS NULL THEN
    IF jwt_email IS NULL THEN
      RAISE EXCEPTION 'Cannot verify invitation for this session';
    END IF;
    IF lower(trim(inv.invited_email)) IS DISTINCT FROM jwt_email THEN
      RAISE EXCEPTION 'Invitation email does not match your account';
    END IF;
  END IF;

  ver := coalesce(nullif(trim(p_terms_version), ''), '1.0');

  IF NOT EXISTS (
    SELECT 1
    FROM public.project_owner_terms_acceptances t
    WHERE t.invitation_id = p_invitation_id AND t.user_id = uid
  ) THEN
    INSERT INTO public.project_owner_terms_acceptances (
      user_id,
      invitation_id,
      terms_version,
      ip_address,
      user_agent
    ) VALUES (
      uid,
      p_invitation_id,
      ver,
      NULL,
      p_user_agent
    );
  END IF;

  UPDATE public.project_owner_invitations
  SET
    status = 'accepted',
    invited_user_id = uid,
    updated_at = now()
  WHERE id = p_invitation_id;

  SELECT p.roles INTO new_roles
  FROM public.user_profiles p
  WHERE p.user_id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  new_roles := COALESCE(new_roles, ARRAY[]::text[]);
  IF NOT ('project_owner' = ANY (new_roles)) THEN
    new_roles := array_append(new_roles, 'project_owner');
  END IF;

  PERFORM set_config('app.profile_roles_ok', '1', true);
  UPDATE public.user_profiles
  SET roles = new_roles, updated_at = now()
  WHERE user_id = uid;
  PERFORM set_config('app.profile_roles_ok', '0', true);

  RETURN jsonb_build_object('success', true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.complete_project_owner_invitation(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_project_owner_invitation(uuid, text, text) TO authenticated;
