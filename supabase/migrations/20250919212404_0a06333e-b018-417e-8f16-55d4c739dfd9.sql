-- Add skill_level column to projects table
ALTER TABLE public.projects 
ADD COLUMN skill_level text;