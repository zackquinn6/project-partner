-- Partner apps and Expert support toggles for admin (used in project planning and kickoff)
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES
  ('partner_apps_enabled', '{"enabled": true}'::jsonb),
  ('expert_support_enabled', '{"enabled": true}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
