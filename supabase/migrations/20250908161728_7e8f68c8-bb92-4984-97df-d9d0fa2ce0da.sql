-- Create helper functions for notification settings to avoid TypeScript issues

-- Function to get user notification settings
CREATE OR REPLACE FUNCTION get_user_notification_settings(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email_enabled BOOLEAN,
  sms_enabled BOOLEAN,
  email_address TEXT,
  phone_number TEXT,
  notify_monthly BOOLEAN,
  notify_weekly BOOLEAN,
  notify_due_date BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM maintenance_notification_settings 
  WHERE maintenance_notification_settings.user_id = user_uuid;
$$;

-- Function to upsert notification settings
CREATE OR REPLACE FUNCTION upsert_notification_settings(
  user_uuid UUID,
  email_enabled BOOLEAN,
  sms_enabled BOOLEAN,
  email_address TEXT,
  phone_number TEXT,
  notify_monthly BOOLEAN,
  notify_weekly BOOLEAN,
  notify_due_date BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  INSERT INTO maintenance_notification_settings (
    user_id,
    email_enabled,
    sms_enabled,
    email_address,
    phone_number,
    notify_monthly,
    notify_weekly,
    notify_due_date
  ) VALUES (
    user_uuid,
    email_enabled,
    sms_enabled,
    email_address,
    phone_number,
    notify_monthly,
    notify_weekly,
    notify_due_date
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email_enabled = EXCLUDED.email_enabled,
    sms_enabled = EXCLUDED.sms_enabled,
    email_address = EXCLUDED.email_address,
    phone_number = EXCLUDED.phone_number,
    notify_monthly = EXCLUDED.notify_monthly,
    notify_weekly = EXCLUDED.notify_weekly,
    notify_due_date = EXCLUDED.notify_due_date,
    updated_at = now()
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$$;