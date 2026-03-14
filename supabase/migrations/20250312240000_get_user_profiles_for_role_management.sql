-- Allow admins to load all user_profiles for the role management UI.
-- RLS may restrict direct select; this SECURITY DEFINER function returns rows only when caller is admin.

CREATE OR REPLACE FUNCTION public.get_user_profiles_for_role_management()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  nickname text,
  display_name text,
  roles text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    up.user_id,
    up.email,
    up.full_name,
    up.nickname,
    up.display_name,
    up.roles
  FROM user_profiles up
  WHERE (SELECT public.is_admin(auth.uid()));
$$;

COMMENT ON FUNCTION public.get_user_profiles_for_role_management() IS 'Returns all user_profiles for admin role management UI. No rows if caller is not admin.';

-- Allow admins to set a user's role (single role: user, project_owner, or admin).
-- Removes project_owners rows when changing away from project_owner.
CREATE OR REPLACE FUNCTION public.set_user_role_for_management(p_user_id uuid, p_new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (SELECT public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_new_role NOT IN ('user', 'project_owner', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  IF p_new_role <> 'project_owner' THEN
    DELETE FROM project_owners WHERE project_owners.user_id = p_user_id;
  END IF;
  UPDATE user_profiles SET roles = ARRAY[p_new_role]::text[] WHERE user_profiles.user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.set_user_role_for_management(uuid, text) IS 'Admin-only: set a user to a single role. Cleans project_owners when switching away from project_owner.';
