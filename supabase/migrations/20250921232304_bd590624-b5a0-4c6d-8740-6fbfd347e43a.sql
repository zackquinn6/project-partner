-- Add missing effort_level column to project_runs table
-- This column seems to be missing but is being referenced in the code

ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS effort_level text;