-- Migration: Add is_linked field to project_phases for incorporated phase tracking
-- Date: 2025-12-04
-- Description: Ensure incorporated phases can be properly identified and copied

-- IMPORTANT DISCOVERY:
-- Project runs store phases as JSONB in 'project_runs.phases' column
-- Project templates use 'project_phases' relational table
-- Incorporated phases have source_project_id set but NO is_linked boolean field

-- Add is_linked field to project_phases to explicitly mark incorporated phases
ALTER TABLE project_phases 
ADD COLUMN IF NOT EXISTS is_linked BOOLEAN DEFAULT FALSE;

-- Update existing incorporated phases (those with source_project_id)
UPDATE project_phases 
SET is_linked = TRUE 
WHERE source_project_id IS NOT NULL;

-- Add check constraint to ensure is_linked matches source_project_id
ALTER TABLE project_phases
ADD CONSTRAINT check_is_linked_matches_source 
CHECK (
  (is_linked = TRUE AND source_project_id IS NOT NULL) OR
  (is_linked = FALSE AND source_project_id IS NULL) OR
  (is_linked IS NULL AND source_project_id IS NULL)
);

-- Add comments
COMMENT ON COLUMN project_phases.is_linked IS 'TRUE if this phase was incorporated from another project. Should match (source_project_id IS NOT NULL).';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_project_phases_is_linked 
  ON project_phases(is_linked) 
  WHERE is_linked = TRUE;

-- Now the create_project_run_snapshot function can use is_linked
-- to properly identify and copy incorporated phases to the JSONB

