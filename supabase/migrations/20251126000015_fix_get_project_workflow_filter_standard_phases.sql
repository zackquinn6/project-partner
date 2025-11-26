-- Fix get_project_workflow_with_standards to properly filter out old standard phases
-- Migration: 20251126000015_fix_get_project_workflow_filter_standard_phases.sql
--
-- The issue: Old standard phases in regular projects' project_phases table are being included
-- even though they should only come from Standard Project Foundation.
-- This migration ensures we directly query only custom phases (is_standard = FALSE) from regular projects.

CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(
  p_project_id UUID
)
RETURNS JSONB AS $$
DECLARE
  workflow_json JSONB := '[]'::jsonb;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  standard_phases_json JSONB;
  custom_phases_json JSONB;
  all_phases_json JSONB := '[]'::jsonb;
  combined_phases_json JSONB := '[]'::jsonb;
BEGIN
  -- If this IS the Standard Project Foundation, just return its phases
  IF p_project_id = standard_project_id THEN
    SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
    INTO workflow_json;
    RETURN COALESCE(workflow_json, '[]'::jsonb);
  END IF;

  -- Get standard phases from Standard Project Foundation
  -- These are dynamically pulled from the foundation, not copied
  -- CRITICAL: This ensures that if a phase is deleted from Standard Project Foundation,
  -- it will NOT appear in regular projects (dynamic linking)
  SELECT public.rebuild_phases_json_from_project_phases(standard_project_id)
  INTO standard_phases_json;

  -- CRITICAL: For regular projects, we need to filter out old standard phases
  -- The issue: rebuild_phases_json_from_project_phases may include old standard phases from project_phases table
  -- Solution: Get all phases, then filter by checking the database is_standard column directly
  SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
  INTO custom_phases_json;

  -- CRITICAL: Filter out any standard phases from custom_phases_json
  -- Standard phases should ONLY come from Standard Project Foundation (standard_phases_json)
  -- We check the database project_phases table directly to see if is_standard = TRUE
  -- This ensures we filter correctly even if the JSON isStandard flag is wrong/missing
  IF custom_phases_json IS NOT NULL AND jsonb_array_length(custom_phases_json) > 0 THEN
    -- Get list of standard phase names from Standard Project Foundation to exclude
    -- Also check database is_standard column for each phase
    DECLARE
      standard_phase_names TEXT[] := ARRAY[]::TEXT[];
      phase_id UUID;
      phase_is_standard BOOLEAN;
    BEGIN
      -- Extract standard phase names from standard_phases_json
      SELECT ARRAY_AGG(phase->>'name')
      INTO standard_phase_names
      FROM jsonb_array_elements(COALESCE(standard_phases_json, '[]'::jsonb)) AS phase
      WHERE phase->>'name' IS NOT NULL;

      -- Filter out phases that:
      -- 1. Have isStandard = TRUE in JSON, OR
      -- 2. Have is_standard = TRUE in database project_phases table, OR
      -- 3. Have a name that matches a current standard phase name
      SELECT jsonb_agg(phase)
      INTO custom_phases_json
      FROM jsonb_array_elements(custom_phases_json) AS phase
      WHERE (
        -- Check JSON isStandard flag
        (phase->>'isStandard')::boolean IS DISTINCT FROM TRUE
        -- Check database is_standard column
        AND (
          phase->>'id' IS NULL OR
          NOT EXISTS (
            SELECT 1 FROM public.project_phases pp
            WHERE pp.id = (phase->>'id')::UUID
            AND pp.is_standard = TRUE
          )
        )
        -- Check name matching (exclude if name matches current standard phase)
        AND (phase->>'name' IS NULL OR NOT (phase->>'name' = ANY(standard_phase_names)))
      );
      
      -- If all phases were filtered out, set to empty array
      custom_phases_json := COALESCE(custom_phases_json, '[]'::jsonb);
    END;
  END IF;

  -- Combine all phases into a single array
  -- We need to merge them properly based on position_rule, not just concatenate
  combined_phases_json := COALESCE(standard_phases_json, '[]'::jsonb) || COALESCE(custom_phases_json, '[]'::jsonb);

  -- Sort the combined phases by position_rule
  -- This ensures custom phases with position_rule (e.g., nth:3) are inserted in the correct position
  -- The sorting logic matches rebuild_phases_json_from_project_phases:
  -- 1. 'first' phases first
  -- 2. 'nth' phases by position_value
  -- 3. 'last_minus_n' phases (ordered by position_value descending)
  -- 4. 'last' phases last
  -- 5. NULL position_rule phases (custom phases without position_rule) by created_at
  SELECT jsonb_agg(phase ORDER BY
    CASE
      WHEN phase->>'positionRule' = 'first' THEN 1
      WHEN phase->>'positionRule' = 'nth' THEN 2
      WHEN phase->>'positionRule' = 'last_minus_n' THEN 3
      WHEN phase->>'positionRule' = 'last' THEN 4
      ELSE 5  -- NULL position_rule (custom phases)
    END,
    CASE
      WHEN phase->>'positionRule' = 'nth' THEN (phase->>'positionValue')::integer
      WHEN phase->>'positionRule' = 'last_minus_n' THEN -(phase->>'positionValue')::integer  -- Negative for descending order
      ELSE NULL
    END NULLS LAST,
    (phase->>'createdAt')::timestamptz NULLS LAST
  )
  INTO all_phases_json
  FROM jsonb_array_elements(combined_phases_json) AS phase;

  RETURN COALESCE(all_phases_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_project_workflow_with_standards IS 
'Dynamically merges standard phases from Standard Project Foundation with custom phases from regular projects.
Standard phases are pulled dynamically from Standard Project Foundation (not copied).
If a standard phase is deleted from Standard Project Foundation, it will NOT appear in regular projects.
Old standard phases in regular projects are filtered out by both isStandard flag and name matching.';

