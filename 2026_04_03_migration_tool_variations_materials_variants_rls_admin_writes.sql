-- Allow catalog admins to write tool_variations and materials_variants from the app (VariationManager).
-- Without this, POST returns 403 / new row violates row-level security (42501).
--
-- SECURITY DEFINER + OWNER postgres: ensures reads in this function are not blocked by RLS on
-- user_profiles / user_roles when evaluated from an INSERT policy (invoker-only RLS behavior).
--
-- Apply the full file in Supabase SQL Editor. If inserts still fail, run the diagnostics at the bottom.

CREATE OR REPLACE FUNCTION public.can_manage_tool_variation_catalog()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  uid uuid := auth.uid();
  via_fn boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    SELECT public.is_admin(check_user_id => uid) INTO via_fn;
    IF via_fn IS TRUE THEN
      RETURN true;
    END IF;
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
    WHEN OTHERS THEN
      BEGIN
        SELECT public.is_admin(uid) INTO via_fn;
        IF via_fn IS TRUE THEN
          RETURN true;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END;
  END;

  -- user_profiles.roles as text[] (case-insensitive)
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM public.user_profiles p
      CROSS JOIN LATERAL unnest(COALESCE(p.roles, ARRAY[]::text[])) AS r(role)
      WHERE p.user_id = uid
        AND lower(btrim(r.role)) = 'admin'
    ) THEN
      RETURN true;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  -- user_profiles.roles as json/jsonb array of strings
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM public.user_profiles p,
      LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(to_jsonb(p.roles)) = 'array' THEN to_jsonb(p.roles)
          ELSE '[]'::jsonb
        END
      ) AS e(elem)
      WHERE p.user_id = uid
        AND lower(btrim(e.elem)) = 'admin'
    ) THEN
      RETURN true;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  -- user_roles (some environments use this instead of user_profiles.roles)
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = uid
        AND lower(btrim(ur.role)) = 'admin'
    ) THEN
      RETURN true;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN false;
END;
$$;

ALTER FUNCTION public.can_manage_tool_variation_catalog() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.can_manage_tool_variation_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_tool_variation_catalog() TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.tool_variations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.materials_variants TO authenticated;

-- tool_variations
DROP POLICY IF EXISTS "tool_variations_insert_admin" ON public.tool_variations;
DROP POLICY IF EXISTS "tool_variations_update_admin" ON public.tool_variations;
DROP POLICY IF EXISTS "tool_variations_delete_admin" ON public.tool_variations;

CREATE POLICY "tool_variations_insert_admin"
  ON public.tool_variations
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_tool_variation_catalog() IS TRUE);

CREATE POLICY "tool_variations_update_admin"
  ON public.tool_variations
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_tool_variation_catalog() IS TRUE)
  WITH CHECK (public.can_manage_tool_variation_catalog() IS TRUE);

CREATE POLICY "tool_variations_delete_admin"
  ON public.tool_variations
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (public.can_manage_tool_variation_catalog() IS TRUE);

-- materials_variants
DROP POLICY IF EXISTS "materials_variants_insert_admin" ON public.materials_variants;
DROP POLICY IF EXISTS "materials_variants_update_admin" ON public.materials_variants;
DROP POLICY IF EXISTS "materials_variants_delete_admin" ON public.materials_variants;

CREATE POLICY "materials_variants_insert_admin"
  ON public.materials_variants
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_tool_variation_catalog() IS TRUE);

CREATE POLICY "materials_variants_update_admin"
  ON public.materials_variants
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_tool_variation_catalog() IS TRUE)
  WITH CHECK (public.can_manage_tool_variation_catalog() IS TRUE);

CREATE POLICY "materials_variants_delete_admin"
  ON public.materials_variants
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (public.can_manage_tool_variation_catalog() IS TRUE);

-- Diagnostics (run manually if 403 persists):
--
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'tool_variations';
--
-- SELECT polname, polpermissive, polroles::regrole[], polcmd, pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid)
-- FROM pg_policy
-- JOIN pg_class ON pg_class.oid = polrelid
-- WHERE relname = 'tool_variations';
--
-- SET request.jwt.claim.sub = '<your-auth-user-uuid>';
-- SET ROLE authenticated;
-- SELECT public.can_manage_tool_variation_catalog();
