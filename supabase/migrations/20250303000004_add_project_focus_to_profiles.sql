-- Add project_focus to profiles (step 3 onboarding: schedule | quality | savings)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS project_focus TEXT
CHECK (project_focus IS NULL OR project_focus IN ('schedule', 'quality', 'savings'));

COMMENT ON COLUMN public.profiles.project_focus IS 'Primary project management focus from onboarding step 3: schedule, quality, or savings';
