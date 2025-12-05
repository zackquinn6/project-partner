-- =====================================================
-- ADD MISSING COLUMNS TO PROJECTS TABLE
-- parent_project_id for project versioning/hierarchy
-- =====================================================

-- Add parent_project_id column (for project versioning and revisions)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS parent_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_projects_parent_project_id 
  ON public.projects(parent_project_id);

-- Add comment
COMMENT ON COLUMN public.projects.parent_project_id IS 
'References parent project for versioning. When a project is revised, the new version references the original via this column.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ parent_project_id column added to projects table';
  RAISE NOTICE '✅ Index created for efficient querying';
  RAISE NOTICE '✅ Projects can now have parent-child relationships for versioning';
END $$;

