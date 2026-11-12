-- Shared login (phase 7e): Continue with Toolio is the only sign-in, so its on/off switch is gone.
-- Re-runnable.

DROP POLICY IF EXISTS app_settings_toolio_sign_in_read ON public.app_settings;
DELETE FROM public.app_settings WHERE setting_key = 'toolio_sign_in_enabled';
