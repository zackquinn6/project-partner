-- Add is_standard_template column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS is_standard_template BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_standard_template 
ON public.projects(is_standard_template) 
WHERE is_standard_template = true;

-- Update the Standard Project Foundation if it exists
UPDATE public.projects 
SET is_standard_template = true 
WHERE id = '00000000-0000-0000-0000-000000000001';
