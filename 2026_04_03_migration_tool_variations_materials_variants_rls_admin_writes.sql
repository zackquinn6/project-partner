-- Allow catalog admins to write tool_variations and materials_variants from the app (VariationManager).
-- Without these policies, POST returns 403 / new row violates row-level security (42501).
-- Matches access model: Tools & Materials Library is limited to users who pass is_admin (see AdminView).

-- tool_variations
DROP POLICY IF EXISTS "tool_variations_insert_admin" ON public.tool_variations;
CREATE POLICY "tool_variations_insert_admin"
  ON public.tool_variations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "tool_variations_update_admin" ON public.tool_variations;
CREATE POLICY "tool_variations_update_admin"
  ON public.tool_variations
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "tool_variations_delete_admin" ON public.tool_variations;
CREATE POLICY "tool_variations_delete_admin"
  ON public.tool_variations
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- materials_variants (same catalog maintenance path)
DROP POLICY IF EXISTS "materials_variants_insert_admin" ON public.materials_variants;
CREATE POLICY "materials_variants_insert_admin"
  ON public.materials_variants
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "materials_variants_update_admin" ON public.materials_variants;
CREATE POLICY "materials_variants_update_admin"
  ON public.materials_variants
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "materials_variants_delete_admin" ON public.materials_variants;
CREATE POLICY "materials_variants_delete_admin"
  ON public.materials_variants
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
