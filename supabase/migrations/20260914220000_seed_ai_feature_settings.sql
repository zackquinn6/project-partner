-- Seed site-wide AI feature toggles in app_settings.
-- All AI on; project generator off; scheduler / repair / help chat on.
-- Idempotent: only inserts missing keys (does not overwrite admin changes).

INSERT INTO public.app_settings (setting_key, setting_value, updated_at)
VALUES
  ('ai_features_enabled', '{"enabled": true}'::jsonb, now()),
  ('ai_project_generator_enabled', '{"enabled": false}'::jsonb, now()),
  ('ai_scheduler_availability_enabled', '{"enabled": true}'::jsonb, now()),
  ('ai_repair_enabled', '{"enabled": true}'::jsonb, now()),
  ('ai_project_help_chat_enabled', '{"enabled": true}'::jsonb, now())
ON CONFLICT (setting_key) DO NOTHING;
