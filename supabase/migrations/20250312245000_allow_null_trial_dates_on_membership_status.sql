-- When beta_mode is enabled, create_membership_status_on_user_signup inserts NULL for trial_start_date
-- and trial_end_date. Allow NULL so that insert succeeds.

ALTER TABLE membership_status
  ALTER COLUMN trial_start_date DROP NOT NULL;

ALTER TABLE membership_status
  ALTER COLUMN trial_end_date DROP NOT NULL;
