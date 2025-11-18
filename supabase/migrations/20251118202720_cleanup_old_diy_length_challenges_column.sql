-- Cleanup migration: Remove old diy_length_challenges column if it still exists
-- This should only run after ensuring all data has been migrated to project_challenges

-- Remove old column from projects table if it still exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'diy_length_challenges'
  ) THEN
    -- First, ensure any remaining data is copied to project_challenges
    UPDATE public.projects 
    SET project_challenges = diy_length_challenges 
    WHERE project_challenges IS NULL 
      AND diy_length_challenges IS NOT NULL;
    
    -- Now drop the old column
    ALTER TABLE public.projects 
      DROP COLUMN diy_length_challenges;
    
    RAISE NOTICE 'Dropped diy_length_challenges column from projects table';
  ELSE
    RAISE NOTICE 'diy_length_challenges column does not exist in projects table';
  END IF;
END $$;

-- Remove old column from project_runs table if it still exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'project_runs' 
    AND column_name = 'diy_length_challenges'
  ) THEN
    -- First, ensure any remaining data is copied to project_challenges
    UPDATE public.project_runs 
    SET project_challenges = diy_length_challenges 
    WHERE project_challenges IS NULL 
      AND diy_length_challenges IS NOT NULL;
    
    -- Now drop the old column
    ALTER TABLE public.project_runs 
      DROP COLUMN diy_length_challenges;
    
    RAISE NOTICE 'Dropped diy_length_challenges column from project_runs table';
  ELSE
    RAISE NOTICE 'diy_length_challenges column does not exist in project_runs table';
  END IF;
END $$;

