-- Shared login (phase 7): switch for "Continue with Toolio" on the sign-in page.
-- Starts off; an admin turns it on in Admin -> Public site & catalog once the
-- custom:toolio provider passes its test accounts. Re-runnable.

INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('toolio_sign_in_enabled', '{"enabled": false}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- The sign-in page reads the switch before anyone is signed in.
DROP POLICY IF EXISTS app_settings_toolio_sign_in_read ON public.app_settings;
CREATE POLICY app_settings_toolio_sign_in_read ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (setting_key = 'toolio_sign_in_enabled');
