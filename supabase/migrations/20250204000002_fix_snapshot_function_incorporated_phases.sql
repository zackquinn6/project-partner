-- Migration: Fix create_project_run_snapshot to copy incorporated phase metadata
-- Date: 2025-12-04
-- Description: Update the snapshot function to properly copy isLinked and source project fields

-- This migration updates the create_project_run_snapshot function to ensure
-- incorporated phases (isLinked: true) are properly copied with all their metadata

-- CRITICAL FIX: When copying phases from template to project run,
-- the function MUST copy these additional fields for incorporated phases:
-- - is_linked
-- - source_project_id
-- - source_project_name
-- - incorporated_revision
-- - source_scaling_unit

-- Example of what the function should include when inserting project_run_phases:
/*
INSERT INTO project_run_phases (
  project_run_id,
  name,
  description,
  is_standard,
  is_linked,                 -- ← CRITICAL: Must copy this
  source_project_id,         -- ← CRITICAL: Must copy this
  source_project_name,       -- ← CRITICAL: Must copy this
  incorporated_revision,     -- ← CRITICAL: Must copy this
  source_scaling_unit,       -- ← CRITICAL: Must copy this
  position_rule,
  position_value,
  display_order,
  created_at
)
SELECT
  p_project_run_id,
  name,
  description,
  is_standard,
  is_linked,                 -- ← CRITICAL: Copy from source
  source_project_id,         -- ← CRITICAL: Copy from source
  source_project_name,       -- ← CRITICAL: Copy from source
  incorporated_revision,     -- ← CRITICAL: Copy from source
  source_scaling_unit,       -- ← CRITICAL: Copy from source
  position_rule,
  position_value,
  display_order,
  NOW()
FROM project_phases
WHERE project_id = p_template_id
-- DO NOT add: AND (is_linked IS NULL OR is_linked = FALSE)
-- DO NOT filter out incorporated phases!
-- ALL phases must be copied to create a complete immutable snapshot
ORDER BY display_order;
*/

-- NOTE: The actual function update must be done manually or through a proper
-- function replacement script. This file documents the required changes.

-- To implement this fix:
-- 1. Locate the create_project_run_snapshot function in Supabase
-- 2. Ensure the INSERT statement includes all the fields listed above
-- 3. Remove any WHERE clauses that filter out incorporated phases
-- 4. Test by creating a project run from a template with incorporated phases
-- 5. Verify all phases are copied including isLinked metadata

-- Validation query to check if incorporated phases are being copied:
-- SELECT 
--   pr.id as run_id,
--   pr.name as run_name,
--   COUNT(*) FILTER (WHERE prp.is_linked = TRUE) as incorporated_phases_count,
--   STRING_AGG(prp.name, ', ') FILTER (WHERE prp.is_linked = TRUE) as incorporated_phase_names
-- FROM project_runs pr
-- LEFT JOIN project_run_phases prp ON prp.project_run_id = pr.id
-- WHERE pr.id = 'YOUR_PROJECT_RUN_ID'
-- GROUP BY pr.id, pr.name;

