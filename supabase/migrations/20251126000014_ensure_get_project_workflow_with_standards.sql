-- Ensure get_project_workflow_with_standards function exists and works correctly
-- This function dynamically merges standard phases from Standard Project Foundation with custom phases from regular projects
-- Migration: 20251126000014_ensure_get_project_workflow_with_standards.sql

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
  phase_item JSONB;
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

  -- Get custom phases from the project template (if any)
  -- Only custom phases are stored in the project's project_phases table
  SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
  INTO custom_phases_json;

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
If a standard phase is deleted from Standard Project Foundation, it will NOT appear in regular projects.';

