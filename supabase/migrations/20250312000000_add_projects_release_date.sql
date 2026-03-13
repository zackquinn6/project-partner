-- Add release_date to projects table (for "Coming soon" visibility)
-- Run this in Supabase SQL Editor or via supabase db push

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS release_date date;

COMMENT ON COLUMN public.projects.release_date IS 'Optional release date when visibility is coming-soon.';
