-- Add images columns to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cover_image text;