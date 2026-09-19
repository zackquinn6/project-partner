-- Roll existing profiles onto dark after the industrial retheme.
-- Users can still switch back to light from Appearance settings.
UPDATE public.user_profiles
SET theme_mode = 'dark'
WHERE theme_mode = 'light';
