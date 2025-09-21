-- Add missing skill_level column to project_runs table
-- This column is being referenced in the code but doesn't exist in the table

ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS skill_level text;