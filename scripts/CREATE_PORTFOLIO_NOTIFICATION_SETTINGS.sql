-- Portfolio / project dashboard & task manager reminder preferences (per user).
-- Run in Supabase SQL editor (or migrate) before using Reminders & notifications in the app.

CREATE TABLE IF NOT EXISTS public.portfolio_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT false,
  email_address text,
  sms_enabled boolean NOT NULL DEFAULT false,
  phone_number text,
  notify_weekly_budget boolean NOT NULL DEFAULT false,
  notify_daily_task_status boolean NOT NULL DEFAULT false,
  notify_daily_celebrations boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_notification_settings_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS portfolio_notification_settings_user_id_idx
  ON public.portfolio_notification_settings (user_id);

ALTER TABLE public.portfolio_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_notification_settings_select_own"
  ON public.portfolio_notification_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "portfolio_notification_settings_insert_own"
  ON public.portfolio_notification_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "portfolio_notification_settings_update_own"
  ON public.portfolio_notification_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
