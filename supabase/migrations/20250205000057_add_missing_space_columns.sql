-- =====================================================
-- ADD MISSING COLUMNS TO PROJECT_RUN_SPACES TABLE
-- These columns are used for backward compatibility
-- and to track space origin (from home vs custom)
-- =====================================================

-- Add is_from_home column
ALTER TABLE public.project_run_spaces 
ADD COLUMN IF NOT EXISTS is_from_home BOOLEAN DEFAULT false;

-- Add scale_value column (legacy, for backward compatibility)
ALTER TABLE public.project_run_spaces 
ADD COLUMN IF NOT EXISTS scale_value NUMERIC;

-- Add scale_unit column (legacy, for backward compatibility)
ALTER TABLE public.project_run_spaces 
ADD COLUMN IF NOT EXISTS scale_unit TEXT;

-- Add comments
COMMENT ON COLUMN public.project_run_spaces.is_from_home IS 'Indicates if this space was imported from the home record (true) or created custom (false)';
COMMENT ON COLUMN public.project_run_spaces.scale_value IS 'Legacy column: size value for the space (for backward compatibility, prefer using project_run_space_sizing table)';
COMMENT ON COLUMN public.project_run_spaces.scale_unit IS 'Legacy column: scaling unit for the space (for backward compatibility, prefer using project_run_space_sizing table)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added is_from_home, scale_value, and scale_unit columns to project_run_spaces table';
END $$;

