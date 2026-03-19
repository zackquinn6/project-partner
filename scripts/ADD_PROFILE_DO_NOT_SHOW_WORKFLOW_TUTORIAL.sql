-- Persist "Don't show workflow tutorial again" on the user profile (not only in personality_profile JSON).
-- Run in Supabase SQL editor. Safe to run once; uses IF NOT EXISTS pattern where supported.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS do_not_show_workflow_tutorial boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.do_not_show_workflow_tutorial IS
  'When true, the guided workflow tutorial does not auto-open for this user.';

-- One-time: copy opt-out from legacy personality_profile JSON (if present)
UPDATE public.profiles
SET do_not_show_workflow_tutorial = true
WHERE personality_profile IS NOT NULL
  AND (personality_profile::jsonb ? 'do_not_show_workflow_tutorial')
  AND (personality_profile::jsonb->>'do_not_show_workflow_tutorial') = 'true';
