-- Restrict catalog writes on variant tables to admins
DROP POLICY IF EXISTS "materials_variants_insert_authenticated" ON public.materials_variants;
DROP POLICY IF EXISTS "materials_variants_update_authenticated" ON public.materials_variants;
DROP POLICY IF EXISTS "materials_variants_delete_authenticated" ON public.materials_variants;

CREATE POLICY "materials_variants_insert_admin" ON public.materials_variants
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) IS TRUE);
CREATE POLICY "materials_variants_update_admin" ON public.materials_variants
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) IS TRUE) WITH CHECK (public.is_admin(auth.uid()) IS TRUE);
CREATE POLICY "materials_variants_delete_admin" ON public.materials_variants
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) IS TRUE);

DROP POLICY IF EXISTS "tool_variations_insert_authenticated" ON public.tool_variations;
DROP POLICY IF EXISTS "tool_variations_update_authenticated" ON public.tool_variations;
DROP POLICY IF EXISTS "tool_variations_delete_authenticated" ON public.tool_variations;

CREATE POLICY "tool_variations_insert_admin" ON public.tool_variations
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_tool_variation_catalog() IS TRUE);
CREATE POLICY "tool_variations_update_admin" ON public.tool_variations
  FOR UPDATE TO authenticated USING (public.can_manage_tool_variation_catalog() IS TRUE) WITH CHECK (public.can_manage_tool_variation_catalog() IS TRUE);
CREATE POLICY "tool_variations_delete_admin" ON public.tool_variations
  FOR DELETE TO authenticated USING (public.can_manage_tool_variation_catalog() IS TRUE);

-- home_risks reference data: signed-in readers only (was anon-readable)
DROP POLICY IF EXISTS "Anyone can view home risks" ON public.home_risks;
CREATE POLICY "home_risks_select_authenticated" ON public.home_risks
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.home_risks FROM anon;

-- feature_roadmap: drop duplicate public select policy
DROP POLICY IF EXISTS "feature_roadmap_public_select" ON public.feature_roadmap;