-- Add is_popular to projects for "Popular projects" carousel in catalog
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.is_popular IS 'When true, project appears in the Popular projects carousel on the Project Catalog.';
