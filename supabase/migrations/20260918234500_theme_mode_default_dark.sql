-- Industrial retheme: dark graphite is the default experience for new profiles.
ALTER TABLE public.user_profiles
  ALTER COLUMN theme_mode SET DEFAULT 'dark';
