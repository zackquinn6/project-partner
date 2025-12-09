-- =====================================================
-- ADD instruction_level_preference COLUMN TO project_runs TABLE
-- This column stores the user's preference for instruction detail level
-- =====================================================

-- Add instruction_level_preference column
ALTER TABLE public.project_runs 
ADD COLUMN IF NOT EXISTS instruction_level_preference TEXT;

-- Add comment
COMMENT ON COLUMN public.project_runs.instruction_level_preference IS 'User preference for instruction detail level: beginner, intermediate, advanced, quick, detailed, or new_user';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added instruction_level_preference column to project_runs table';
END $$;

