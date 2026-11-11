-- Shared login (phase 7e): Continue with Toolio is the only sign-in, so its on/off switch is gone.
-- Re-runnable.

DELETE FROM public.app_settings WHERE setting_key = 'toolio_sign_in_enabled';
