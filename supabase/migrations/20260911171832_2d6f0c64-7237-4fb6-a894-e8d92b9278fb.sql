
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;

CREATE POLICY "Public can view public app settings"
ON public.app_settings
FOR SELECT
TO anon
USING (setting_key IN (
  'beta_mode',
  'default_landing_view',
  'expert_support_enabled',
  'partner_apps_enabled',
  'project_catalog_enabled',
  'simplified_public_landing',
  'tile_focus_mode',
  'tool_rentals_enabled',
  'waste_removal_enabled',
  'workshop_labs_accordion_enabled'
));

CREATE POLICY "Authenticated users can view app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

REVOKE EXECUTE ON FUNCTION public.detect_suspicious_activity() FROM anon;
REVOKE EXECUTE ON FUNCTION public.detect_suspicious_activity() FROM PUBLIC;
