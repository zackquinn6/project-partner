-- Allow catalog admins to write tool_variations and materials_variants from the app (VariationManager).
-- Without this, POST returns 403 / new row violates row-level security (42501).
--
-- Policies call a SECURITY DEFINER helper so reading user_profiles does not hit RLS on that table
-- (inline EXISTS in a policy still applies user_profiles RLS and often returns no row).
--
-- Apply in Supabase SQL Editor (project drshvrukkavtpsprfcbc or your fork).

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
    SELECT public.is_admin(uid) INTO via_fn;
    IF via_fn IS TRUE THEN
      RETURN true;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  BEGIN
    IF EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = uid
        AND 'admin' = ANY (p.roles)
    ) THEN
      RETURN true;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
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
          AND e.elem = 'admin'
      ) THEN
        RETURN true;
      END IF;
  END;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_tool_variation_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_tool_variation_catalog() TO authenticated;

-- tool_variations
DROP POLICY IF EXISTS "tool_variations_insert_admin" ON public.tool_variations;
DROP POLICY IF EXISTS "tool_variations_update_admin" ON public.tool_variations;
DROP POLICY IF EXISTS "tool_variations_delete_admin" ON public.tool_variations;

CREATE POLICY "tool_variations_insert_admin"
  ON public.tool_variations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_tool_variation_catalog() IS TRUE);

CREATE POLICY "tool_variations_update_admin"
  ON public.tool_variations
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_tool_variation_catalog() IS TRUE)
  WITH CHECK (public.can_manage_tool_variation_catalog() IS TRUE);

CREATE POLICY "tool_variations_delete_admin"
  ON public.tool_variations
  FOR DELETE
  TO authenticated
  USING (public.can_manage_tool_variation_catalog() IS TRUE);

-- materials_variants
DROP POLICY IF EXISTS "materials_variants_insert_admin" ON public.materials_variants;
DROP POLICY IF EXISTS "materials_variants_update_admin" ON public.materials_variants;
DROP POLICY IF EXISTS "materials_variants_delete_admin" ON public.materials_variants;

CREATE POLICY "materials_variants_insert_admin"
  ON public.materials_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_tool_variation_catalog() IS TRUE);

CREATE POLICY "materials_variants_update_admin"
  ON public.materials_variants
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_tool_variation_catalog() IS TRUE)
  WITH CHECK (public.can_manage_tool_variation_catalog() IS TRUE);

CREATE POLICY "materials_variants_delete_admin"
  ON public.materials_variants
  FOR DELETE
  TO authenticated
  USING (public.can_manage_tool_variation_catalog() IS TRUE);
