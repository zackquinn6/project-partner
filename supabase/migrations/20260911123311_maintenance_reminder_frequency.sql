-- Max cadence for home-maintenance reminder emails + last successful send stamp.
-- Used by daily-maintenance-reminders (and daily-workflow-task-digest piggyback).

ALTER TABLE public.maintenance_notification_settings
  ADD COLUMN IF NOT EXISTS max_reminder_frequency text NOT NULL DEFAULT 'biweekly',
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'maintenance_notification_settings_max_reminder_frequency_check'
  ) THEN
    ALTER TABLE public.maintenance_notification_settings
      ADD CONSTRAINT maintenance_notification_settings_max_reminder_frequency_check
      CHECK (max_reminder_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly'));
  END IF;
END $$;

COMMENT ON COLUMN public.maintenance_notification_settings.max_reminder_frequency IS
  'Maximum email reminder cadence: weekly | biweekly | monthly | quarterly. Default biweekly.';

COMMENT ON COLUMN public.maintenance_notification_settings.last_reminder_sent_at IS
  'Timestamp of last successfully sent maintenance reminder email (not test).';

-- Table already has RLS; new columns inherit existing user policies. Service role bypasses RLS for cron.
