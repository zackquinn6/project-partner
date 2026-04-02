-- Allow catalog admins to write tool_variations and materials_variants from the app (VariationManager).
-- Without these policies, POST returns 403 / new row violates row-level security (42501).
--
-- Two signals (OR): public.is_admin(auth.uid()) and the same user_profiles.roles check the
-- app uses in useUserRole (admin in roles array). That covers DBs where is_admin is missing,
-- returns NULL, or cannot read role tables when evaluated inside RLS.
--
-- Apply this file in the Supabase SQL Editor against project drshvrukkavtpsprfcbc (or your fork).

-- tool_variations
DROP POLICY IF EXISTS "tool_variations_insert_admin" ON public.tool_variations;
DROP POLICY IF EXISTS "tool_variations_update_admin" ON public.tool_variations;
DROP POLICY IF EXISTS "tool_variations_delete_admin" ON public.tool_variations;

CREATE POLICY "tool_variations_insert_admin"
  ON public.tool_variations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.is_admin((SELECT auth.uid()))) IS TRUE
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND 'admin' = ANY (p.roles)
    )
  );

CREATE POLICY "tool_variations_update_admin"
  ON public.tool_variations
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.is_admin((SELECT auth.uid()))) IS TRUE
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND 'admin' = ANY (p.roles)
    )
  )
  WITH CHECK (
    (SELECT public.is_admin((SELECT auth.uid()))) IS TRUE
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND 'admin' = ANY (p.roles)
    )
  );

CREATE POLICY "tool_variations_delete_admin"
  ON public.tool_variations
  FOR DELETE
  TO authenticated
  USING (
    (SELECT public.is_admin((SELECT auth.uid()))) IS TRUE
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND 'admin' = ANY (p.roles)
    )
  );

-- materials_variants
DROP POLICY IF EXISTS "materials_variants_insert_admin" ON public.materials_variants;
DROP POLICY IF EXISTS "materials_variants_update_admin" ON public.materials_variants;
DROP POLICY IF EXISTS "materials_variants_delete_admin" ON public.materials_variants;

CREATE POLICY "materials_variants_insert_admin"
  ON public.materials_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.is_admin((SELECT auth.uid()))) IS TRUE
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND 'admin' = ANY (p.roles)
    )
  );

CREATE POLICY "materials_variants_update_admin"
  ON public.materials_variants
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.is_admin((SELECT auth.uid()))) IS TRUE
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND 'admin' = ANY (p.roles)
    )
  )
  WITH CHECK (
    (SELECT public.is_admin((SELECT auth.uid()))) IS TRUE
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND 'admin' = ANY (p.roles)
    )
  );

CREATE POLICY "materials_variants_delete_admin"
  ON public.materials_variants
  FOR DELETE
  TO authenticated
  USING (
    (SELECT public.is_admin((SELECT auth.uid()))) IS TRUE
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND 'admin' = ANY (p.roles)
    )
  );
