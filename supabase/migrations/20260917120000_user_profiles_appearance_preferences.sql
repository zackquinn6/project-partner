-- Appearance preferences on the user profile: theme mode and color scheme.
--
-- The re-skin controls used to live at the bottom of the project workflow sidebar and wrote to
-- localStorage keyed by project run, so the same user got a different look per project and nothing
-- carried across devices. The controls now live in the header gear menu and apply to the whole app,
-- which makes them a user-level preference rather than a per-run one.
--
-- No new RLS policies are needed: user_profiles_select_own_or_admin and user_profiles_update_own
-- already cover own-row read and write for every column on this table. RLS is re-asserted below
-- because it must hold for these columns.

DO $migration$
BEGIN
  ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS theme_mode text NOT NULL DEFAULT 'light';

  ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS color_scheme text NOT NULL DEFAULT 'default';

  -- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so guard on pg_constraint.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_profiles'::regclass
      AND conname = 'user_profiles_theme_mode_check'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_theme_mode_check
      CHECK (theme_mode IN ('light', 'dark'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_profiles'::regclass
      AND conname = 'user_profiles_color_scheme_check'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_color_scheme_check
      CHECK (color_scheme IN ('default', 'blue', 'green', 'purple', 'orange', 'red'));
  END IF;

  ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
END $migration$;

COMMENT ON COLUMN public.user_profiles.theme_mode IS
  'App-wide appearance mode selected from the header gear menu: light or dark.';

COMMENT ON COLUMN public.user_profiles.color_scheme IS
  'App-wide accent color scheme selected from the header gear menu: default, blue, green, purple, orange, or red.';
