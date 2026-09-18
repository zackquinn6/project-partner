-- tools
DROP POLICY IF EXISTS "Anyone can view tools" ON public.tools;
CREATE POLICY "Authenticated users can view tools"
  ON public.tools FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.tools FROM anon;

-- tool_variations
DROP POLICY IF EXISTS "tool_variations_select_public" ON public.tool_variations;
CREATE POLICY "tool_variations_select_authenticated"
  ON public.tool_variations FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.tool_variations FROM anon;

-- materials
DROP POLICY IF EXISTS "Anyone can view materials" ON public.materials;
CREATE POLICY "Authenticated users can view materials"
  ON public.materials FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.materials FROM anon;

-- materials_variants
DROP POLICY IF EXISTS "materials_variants_select_public" ON public.materials_variants;
CREATE POLICY "materials_variants_select_authenticated"
  ON public.materials_variants FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.materials_variants FROM anon;

-- maintenance_templates
DROP POLICY IF EXISTS "Anyone can view maintenance templates" ON public.maintenance_templates;
CREATE POLICY "Authenticated users can view maintenance templates"
  ON public.maintenance_templates FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.maintenance_templates FROM anon;

-- feature_roadmap
DROP POLICY IF EXISTS "Anyone can view feature roadmap" ON public.feature_roadmap;
CREATE POLICY "Authenticated users can view feature roadmap"
  ON public.feature_roadmap FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.feature_roadmap FROM anon;