-- =====================================================
-- ADD MISSING COLUMNS TO PROJECTS TABLE
-- Add all columns that the frontend expects but are missing
-- =====================================================

-- Add images array column
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::TEXT[];

-- Add cover_image column
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Add budget columns
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS budget_per_unit TEXT;

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS budget_per_typical_size TEXT;

-- Add effort and skill level columns
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS effort_level TEXT;

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS skill_level TEXT;

-- Add time estimation columns
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS estimated_total_time TEXT;

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS typical_project_size NUMERIC;

-- Add scaling and item type columns
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS scaling_unit TEXT;

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS item_type TEXT;

-- Add project type column
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'primary';

-- Add project challenges column
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_challenges TEXT;

-- Add comments
COMMENT ON COLUMN public.projects.images IS 'Array of image URLs for the project';
COMMENT ON COLUMN public.projects.cover_image IS 'URL of the cover image for display';
COMMENT ON COLUMN public.projects.budget_per_unit IS 'Budget per scaling unit (e.g., per square foot)';
COMMENT ON COLUMN public.projects.budget_per_typical_size IS 'Budget for typical project size';
COMMENT ON COLUMN public.projects.effort_level IS 'Effort level: Low, Medium, or High';
COMMENT ON COLUMN public.projects.skill_level IS 'Skill level: Beginner, Intermediate, Advanced, or Professional';
COMMENT ON COLUMN public.projects.estimated_total_time IS 'Estimated total time for typical project size';
COMMENT ON COLUMN public.projects.typical_project_size IS 'Typical project size used for estimated total time';
COMMENT ON COLUMN public.projects.scaling_unit IS 'Scaling unit: per square foot, per 10x10 room, per linear foot, per cubic yard, or per item';
COMMENT ON COLUMN public.projects.item_type IS 'Type of item for the project';
COMMENT ON COLUMN public.projects.project_type IS 'Project type: primary or secondary';
COMMENT ON COLUMN public.projects.project_challenges IS 'Admin-defined field explaining most difficult aspects of the project';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added missing columns to projects table';
  RAISE NOTICE '✅ Added: images, cover_image, budget columns, effort/skill levels, time estimates, scaling, project_type, project_challenges';
END $$;

