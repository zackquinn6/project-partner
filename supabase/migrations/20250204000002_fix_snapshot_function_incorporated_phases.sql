-- Migration: Fix create_project_run_snapshot to copy incorporated phases in JSONB
-- Date: 2025-12-04
-- Description: Ensure snapshot function copies ALL phases including incorporated ones

-- CRITICAL DISCOVERY:
-- Phases are stored in project_runs.phases as JSONB, NOT in a separate table.
-- There is NO project_run_phases relational table in the database.

-- The create_project_run_snapshot function should:
-- 1. Fetch the template's phases JSONB from projects.phases or project_templates_live.phases
-- 2. Copy that JSONB directly to project_runs.phases
-- 3. NOT filter out any phases based on isLinked or any other field
-- 4. Create a complete immutable snapshot

-- INCORRECT approach (if function is doing this):
/*
-- Don't do this:
SELECT phases FROM project_templates_live 
WHERE id = p_template_id 
AND NOT (phases::jsonb @> '[{"isLinked": true}]')  -- ❌ Don't filter!
*/

-- CORRECT approach (what function should do):
/*
-- Copy ALL phases as-is:
INSERT INTO project_runs (phases, ...)
SELECT 
  phases,  -- ← Copy entire JSONB including incorporated phases
  ...
FROM project_templates_live
WHERE id = p_template_id;

-- Or if building from project_phases table:
INSERT INTO project_runs (phases, ...)
VALUES (
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', pp.id,
        'name', pp.name,
        'isStandard', pp.is_standard,
        'isLinked', pp.is_linked,  -- ← MUST include this
        'sourceProjectId', pp.source_project_id,  -- ← MUST include this
        'sourceProjectName', pp.source_project_name,  -- ← MUST include this
        -- ... all other phase fields ...
      )
    )
    FROM project_phases pp
    WHERE pp.project_id = p_template_id
    -- NO WHERE filtering of incorporated phases!
    ORDER BY pp.display_order
  ),
  ...
);
*/

-- Validation query to check incorporated phases in a project run:
-- SELECT 
--   id,
--   name,
--   jsonb_array_length(phases) as total_phases,
--   (
--     SELECT COUNT(*) 
--     FROM jsonb_array_elements(phases) phase 
--     WHERE (phase->>'isLinked')::boolean = true
--   ) as incorporated_phases_count,
--   (
--     SELECT jsonb_agg(phase->>'name') 
--     FROM jsonb_array_elements(phases) phase 
--     WHERE (phase->>'isLinked')::boolean = true
--   ) as incorporated_phase_names
-- FROM project_runs
-- WHERE id = 'YOUR_PROJECT_RUN_ID';

SELECT 1; -- No-op migration for documentation purposes

