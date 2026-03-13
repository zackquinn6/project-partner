-- Merge user_xp_history and achievement_notifications into user_achievements.
-- user_achievements: one row per unlock (type='unlock') plus one row per XP event (type='xp').

-- Add columns to user_achievements
ALTER TABLE user_achievements
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'unlock',
  ADD COLUMN IF NOT EXISTS xp_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS phase_name text,
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Allow achievement_id to be null for type='xp' rows
ALTER TABLE user_achievements
  ALTER COLUMN achievement_id DROP NOT NULL;

-- Constrain type
ALTER TABLE user_achievements
  DROP CONSTRAINT IF EXISTS user_achievements_type_check;
ALTER TABLE user_achievements
  ADD CONSTRAINT user_achievements_type_check CHECK (type IN ('unlock', 'xp'));

-- Migrate achievement_notifications: set is_read on matching user_achievements (unlock rows)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'achievement_notifications') THEN
    UPDATE user_achievements ua
    SET is_read = an.is_read
    FROM achievement_notifications an
    WHERE ua.user_id = an.user_id
      AND ua.achievement_id = an.achievement_id
      AND ua.type = 'unlock';

    -- Insert unlock rows for notifications that have no matching user_achievements
    INSERT INTO user_achievements (user_id, achievement_id, project_run_id, type, is_read, created_at, earned_at)
    SELECT an.user_id, an.achievement_id, an.project_run_id, 'unlock', COALESCE(an.is_read, false), an.created_at, an.created_at
    FROM achievement_notifications an
    WHERE NOT EXISTS (
      SELECT 1 FROM user_achievements ua2
      WHERE ua2.user_id = an.user_id AND ua2.achievement_id = an.achievement_id AND ua2.type = 'unlock'
    );

    DROP TABLE achievement_notifications;
  END IF;
END $$;

-- Migrate user_xp_history: insert as type='xp' rows
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_xp_history') THEN
    INSERT INTO user_achievements (user_id, type, project_run_id, xp_amount, reason, phase_name, created_at, earned_at)
    SELECT user_id, 'xp', project_run_id, xp_amount, reason, phase_name, created_at, created_at
    FROM user_xp_history;

    DROP TABLE user_xp_history;
  END IF;
END $$;
