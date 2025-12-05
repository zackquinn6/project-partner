-- =====================================================
-- ADD REVISION_NOTES COLUMN TO PROJECTS TABLE
-- =====================================================

-- Add revision_notes column if it doesn't exist
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS revision_notes TEXT;

COMMENT ON COLUMN public.projects.revision_notes IS 
'Notes describing what changed in this revision. Used when creating new revisions of a project.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ revision_notes column added to projects table';
END $$;

