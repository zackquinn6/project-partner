-- Daily workflow digest: local send time, dedupe key, user time zone for notifications.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS time_zone text NULL;

COMMENT ON COLUMN public.user_profiles.time_zone IS
  'IANA time zone for project workflow digests (e.g. America/Chicago). Set from ZIP suggestion or manually in notification settings.';

ALTER TABLE public.portfolio_notification_settings
  ADD COLUMN IF NOT EXISTS daily_notification_local_time text NULL,
  ADD COLUMN IF NOT EXISTS last_daily_task_digest_for_local_date text NULL;

COMMENT ON COLUMN public.portfolio_notification_settings.daily_notification_local_time IS
  'Local wall time HH:MM (24-hour) when to send the daily open-task digest; interpreted in user_profiles.time_zone.';

COMMENT ON COLUMN public.portfolio_notification_settings.last_daily_task_digest_for_local_date IS
  'Calendar date YYYY-MM-DD in the user time zone for which the last daily digest was sent (dedupe).';
