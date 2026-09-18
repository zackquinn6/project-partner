-- After authenticated blanket SELECT on app_settings was removed, clients only
-- see keys on the public allowlist. AI feature flags were never added there,
-- so useAiFeatureSettings throws Missing ai_features_enabled for non-admins.
-- Also apply the allowlist to authenticated (not only anon), matching the
-- post-tightening access model.

DROP POLICY IF EXISTS "Public can view public app settings" ON public.app_settings;

CREATE POLICY "Public can view public app settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (setting_key IN (
  'ai_features_enabled',
  'ai_project_generator_enabled',
  'ai_project_help_chat_enabled',
  'ai_repair_enabled',
  'ai_scheduler_availability_enabled',
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

-- Idempotent seed: only inserts missing keys (does not overwrite admin changes).
INSERT INTO public.app_settings (setting_key, setting_value, updated_at)
VALUES
  ('ai_features_enabled', '{"enabled": true}'::jsonb, now()),
  ('ai_project_generator_enabled', '{"enabled": false}'::jsonb, now()),
  ('ai_scheduler_availability_enabled', '{"enabled": true}'::jsonb, now()),
  ('ai_repair_enabled', '{"enabled": true}'::jsonb, now()),
  ('ai_project_help_chat_enabled', '{"enabled": true}'::jsonb, now())
ON CONFLICT (setting_key) DO NOTHING;
