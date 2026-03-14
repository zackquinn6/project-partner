-- Add member_status (paid membership) and start/end dates to membership_status.
-- Default: non-member. When user buys via Stripe, set member_status = true and 1-year window.

ALTER TABLE membership_status
  ADD COLUMN IF NOT EXISTS member_status boolean NOT NULL DEFAULT false;

ALTER TABLE membership_status
  ADD COLUMN IF NOT EXISTS membership_start_date date;

ALTER TABLE membership_status
  ADD COLUMN IF NOT EXISTS membership_end_date date;

COMMENT ON COLUMN membership_status.member_status IS 'True when user has active paid membership (e.g. Stripe purchase). Default false.';
COMMENT ON COLUMN membership_status.membership_start_date IS 'Start of paid membership (e.g. Stripe purchase date).';
COMMENT ON COLUMN membership_status.membership_end_date IS 'End of paid membership (e.g. purchase date + 1 year).';

-- New user: create membership_status row. Trial start/end only when app is NOT in beta.
CREATE OR REPLACE FUNCTION public.create_membership_status_on_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  beta_enabled boolean;
  trial_start timestamp with time zone;
  trial_end timestamp with time zone;
BEGIN
  SELECT COALESCE((setting_value->>'enabled')::boolean, false)
  INTO beta_enabled
  FROM app_settings
  WHERE setting_key = 'beta_mode'
  LIMIT 1;

  IF beta_enabled THEN
    trial_start := NULL;
    trial_end := NULL;
  ELSE
    trial_start := now();
    trial_end := now() + interval '7 days';
  END IF;

  INSERT INTO membership_status (
    user_id,
    member_status,
    membership_start_date,
    membership_end_date,
    trial_start_date,
    trial_end_date,
    trial_extended_days,
    email_sent_1day_before,
    email_sent_on_expiry,
    last_trial_notification_date
  )
  VALUES (
    NEW.user_id,
    false,
    NULL,
    NULL,
    trial_start,
    trial_end,
    0,
    false,
    false,
    NULL
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS create_membership_status_on_user_signup ON user_profiles;

CREATE TRIGGER create_membership_status_on_user_signup
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_membership_status_on_user_signup();

COMMENT ON FUNCTION public.create_membership_status_on_user_signup() IS 'Creates membership_status for new users. Trial start/end are set only when beta_mode is disabled.';

-- RPC for app to record that the daily in-app trial reminder was shown (so we don't show again until next day).
CREATE OR REPLACE FUNCTION public.record_trial_notification_shown()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE membership_status
  SET last_trial_notification_date = current_date
  WHERE user_id = auth.uid();
END;
$$;
