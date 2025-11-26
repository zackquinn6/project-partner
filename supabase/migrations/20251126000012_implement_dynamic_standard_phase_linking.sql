-- Implement dynamic standard phase linking
-- Migration: 20251126000012_implement_dynamic_standard_phase_linking.sql
--
-- This migration updates get_project_workflow_with_standards to dynamically merge
-- standard phases from Standard Project Foundation with custom phases from the project template.
-- It also updates create_project_with_standard_foundation_v2 to NOT copy standard phases.

-- ============================================
-- STEP 1: Update get_project_workflow_with_standards to merge standard phases dynamically
-- ============================================
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
    END NULLS LAST
  )
  INTO all_phases_json
  FROM jsonb_array_elements(combined_phases_json) AS phase;

  RETURN COALESCE(all_phases_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_project_workflow_with_standards IS 
'Returns the complete workflow JSON for a project by dynamically merging:
1. Standard phases from Standard Project Foundation (ID: 00000000-0000-0000-0000-000000000001)
2. Custom phases from the project template
This ensures standard phases are always up-to-date and not duplicated.';

-- ============================================
-- STEP 2: Update create_project_with_standard_foundation_v2 to NOT copy standard phases
-- ============================================
CREATE OR REPLACE FUNCTION public.create_project_with_standard_foundation_v2(
  p_project_name TEXT,
  p_project_description TEXT,
  p_category TEXT DEFAULT 'general',
  p_created_by UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  category_array TEXT[];
BEGIN
  -- Convert single category text to array (category column is text[])
  category_array := ARRAY[COALESCE(p_category, 'general')];
  
  -- Create project record only
  -- Standard phases will be dynamically merged via get_project_workflow_with_standards
  INSERT INTO public.projects (
    name,
    description,
    category,
    publish_status,
    created_by,
    is_current_version,
    phases
  ) VALUES (
    p_project_name,
    p_project_description,
    category_array,
    'draft',
    p_created_by,
    true,
    '[]'::jsonb  -- Empty phases JSON - will be built dynamically
  ) RETURNING id INTO new_project_id;

  -- Rebuild phases JSON using get_project_workflow_with_standards
  -- This will merge standard phases from Standard Project Foundation with any custom phases
  UPDATE public.projects
  SET phases = public.get_project_workflow_with_standards(new_project_id)
  WHERE id = new_project_id;

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_project_with_standard_foundation_v2 IS 
'Creates a new project template WITHOUT copying standard phases.
Standard phases are dynamically linked from Standard Project Foundation via get_project_workflow_with_standards.
Only custom phases (if any) are stored in the project_phases table.';

