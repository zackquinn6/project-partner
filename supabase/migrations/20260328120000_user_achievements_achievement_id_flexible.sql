-- user_achievements: app stores (1) unlock rows with catalog UUIDs in achievement_id
-- and (2) XP ledger rows with achievement_id NULL (type = 'xp').
-- Legacy schemas often had NOT NULL and/or FK to public.achievements, which breaks
-- profile-save milestone checks (checkMilestoneUnlocks -> awardXP).

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    CROSS JOIN LATERAL unnest(c.conkey) AS u(attnum)
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = u.attnum
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'user_achievements'
      AND c.contype = 'f'
      AND a.attname = 'achievement_id'
  LOOP
    EXECUTE format('ALTER TABLE public.user_achievements DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.user_achievements
  ALTER COLUMN achievement_id DROP NOT NULL;
