-- Add project_skills column to profiles table to store skill levels for each project type
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS project_skills JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.project_skills IS 'Stores skill levels (0-2) for each project type as JSON: {"Project Name": 0-2} where 0=Beginner, 1=Intermediate, 2=Advanced';

