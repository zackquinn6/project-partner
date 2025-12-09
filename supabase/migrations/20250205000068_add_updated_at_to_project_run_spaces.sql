-- =====================================================
-- ADD updated_at COLUMN TO project_run_spaces TABLE
-- PostgREST requires this column for proper schema caching
-- =====================================================

-- Add updated_at column
ALTER TABLE public.project_run_spaces 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_project_run_spaces_updated_at
  BEFORE UPDATE ON public.project_run_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON COLUMN public.project_run_spaces.updated_at IS 'Timestamp of when the space record was last updated';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added updated_at column and trigger to project_run_spaces table';
END $$;

