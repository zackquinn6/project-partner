-- core_item_attribute_definitions: internal-only reference, not read by the app
DROP POLICY IF EXISTS "read_core_item_attribute_definitions" ON public.core_item_attribute_definitions;
REVOKE SELECT ON public.core_item_attribute_definitions FROM anon;

-- home_risks: legacy table not read by the app; admins retain full access
DROP POLICY IF EXISTS "home_risks_select_authenticated" ON public.home_risks;
DROP POLICY IF EXISTS "Anyone can view home risks" ON public.home_risks;
REVOKE SELECT ON public.home_risks FROM anon;

-- homes_risks: readable only by provisioned account holders
DROP POLICY IF EXISTS "homes_risks_select_authenticated" ON public.homes_risks;
CREATE POLICY "homes_risks_select_account_holders" ON public.homes_risks
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid()));
REVOKE SELECT ON public.homes_risks FROM anon;

-- app_overrides: readable only by provisioned account holders
DROP POLICY IF EXISTS "Allow authenticated users to read app overrides" ON public.app_overrides;
CREATE POLICY "app_overrides_select_account_holders" ON public.app_overrides
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid()));
REVOKE SELECT ON public.app_overrides FROM anon;