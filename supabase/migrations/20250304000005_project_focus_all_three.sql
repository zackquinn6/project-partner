-- Allow project_focus 'all_three' (Optimize all 3) in addition to schedule, quality, savings.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_project_focus_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_project_focus_check
  CHECK (project_focus IS NULL OR project_focus IN ('schedule', 'quality', 'savings', 'all_three'));

COMMENT ON COLUMN public.profiles.project_focus IS 'Primary project management focus from onboarding: schedule, quality, savings, or all_three (optimize all 3)';
