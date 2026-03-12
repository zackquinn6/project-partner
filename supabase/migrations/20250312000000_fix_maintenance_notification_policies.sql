-- Ensure RLS policies on maintenance_notification_settings allow authenticated users
-- to manage (read/write) their own notification settings.

ALTER TABLE public.maintenance_notification_settings
  ENABLE ROW LEVEL SECURITY;

-- Read own settings
DROP POLICY IF EXISTS "Users can read own maintenance notification settings" ON public.maintenance_notification_settings;
CREATE POLICY "Users can read own maintenance notification settings"
  ON public.maintenance_notification_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert own settings
DROP POLICY IF EXISTS "Users can insert own maintenance notification settings" ON public.maintenance_notification_settings;
CREATE POLICY "Users can insert own maintenance notification settings"
  ON public.maintenance_notification_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update own settings
DROP POLICY IF EXISTS "Users can update own maintenance notification settings" ON public.maintenance_notification_settings;
CREATE POLICY "Users can update own maintenance notification settings"
  ON public.maintenance_notification_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete own settings (not used today, but keeps semantics consistent)
DROP POLICY IF EXISTS "Users can delete own maintenance notification settings" ON public.maintenance_notification_settings;
CREATE POLICY "Users can delete own maintenance notification settings"
  ON public.maintenance_notification_settings
  FOR DELETE
  USING (auth.uid() = user_id);

