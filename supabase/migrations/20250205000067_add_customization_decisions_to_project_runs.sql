-- =====================================================
-- ADD customization_decisions COLUMN TO project_runs
-- This column stores user customization decisions from the project customizer
-- =====================================================

ALTER TABLE public.project_runs
ADD COLUMN IF NOT EXISTS customization_decisions JSONB;

COMMENT ON COLUMN public.project_runs.customization_decisions IS 'Stores user customization decisions including standard decisions, if-necessary work, custom planned/unplanned work, and workflow order. Used by ProjectCustomizer component.';

DO $$
BEGIN
  RAISE NOTICE '✅ Added customization_decisions column to project_runs table';
END $$;

