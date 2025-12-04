-- Migration: Ensure incorporated phase fields exist in project_run_phases
-- Date: 2025-12-04
-- Description: Add fields to support incorporated phases in project run snapshots

-- Add incorporated phase tracking fields to project_run_phases
ALTER TABLE project_run_phases 
ADD COLUMN IF NOT EXISTS is_linked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS source_project_id UUID,
ADD COLUMN IF NOT EXISTS source_project_name TEXT,
ADD COLUMN IF NOT EXISTS incorporated_revision INTEGER,
ADD COLUMN IF NOT EXISTS source_scaling_unit TEXT;

-- Add comments explaining the fields
COMMENT ON COLUMN project_run_phases.is_linked IS 'TRUE if this phase was incorporated from another project template';
COMMENT ON COLUMN project_run_phases.source_project_id IS 'ID of the source project if this phase was incorporated';
COMMENT ON COLUMN project_run_phases.source_project_name IS 'Name of the source project for display purposes';
COMMENT ON COLUMN project_run_phases.incorporated_revision IS 'Revision number of the source project when phase was incorporated';
COMMENT ON COLUMN project_run_phases.source_scaling_unit IS 'Original scaling unit from the source project';

-- Create index for faster lookups of incorporated phases
CREATE INDEX IF NOT EXISTS idx_project_run_phases_is_linked 
  ON project_run_phases(is_linked) 
  WHERE is_linked = TRUE;

CREATE INDEX IF NOT EXISTS idx_project_run_phases_source_project 
  ON project_run_phases(source_project_id) 
  WHERE source_project_id IS NOT NULL;

-- CRITICAL: Update the create_project_run_snapshot function to copy these fields
-- The function MUST include these fields when copying from project_phases to project_run_phases

COMMENT ON TABLE project_run_phases IS 'Immutable snapshot of phases for a project run. MUST include all phases from template including incorporated phases (isLinked: true).';

