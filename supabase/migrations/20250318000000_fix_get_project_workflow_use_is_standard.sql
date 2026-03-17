-- Fix get_project_workflow_with_standards: use is_standard (actual column) instead of is_standard_template (nonexistent).
-- The projects table has is_standard boolean, not is_standard_template.

CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(
  p_project_id UUID
)
RETURNS JSONB AS $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  workflow_json JSONB;
  standard_phases_json JSONB;
  custom_phases_json JSONB;
  is_standard_project BOOLEAN;
BEGIN
  -- Check if this is the Standard Project Foundation itself
  SELECT COALESCE(p.is_standard, false) INTO is_standard_project
  FROM public.projects p
  WHERE p.id = p_project_id;

  -- If this is the Standard Project Foundation, just return its phases directly
  IF is_standard_project = true OR p_project_id = standard_project_id THEN
    SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
    INTO workflow_json;
    RETURN COALESCE(workflow_json, '[]'::jsonb);
  END IF;

  -- ALWAYS get standard phases from Standard Project Foundation (never from templates)
  SELECT public.rebuild_phases_json_from_project_phases(standard_project_id)
  INTO standard_phases_json;

  -- Get custom phases from the template (non-standard phases only)
  SELECT
    COALESCE(jsonb_agg(phase), '[]'::jsonb)
  INTO custom_phases_json
  FROM (
    SELECT public.rebuild_phases_json_from_project_phases(p_project_id) as all_phases
  ) phases_data,
  jsonb_array_elements(phases_data.all_phases) as phase
  WHERE (phase->>'isStandard')::boolean = false
     OR phase->>'isStandard' IS NULL;

  -- Merge: standard phases (from Standard Project Foundation) + custom phases (from template)
  workflow_json := COALESCE(standard_phases_json, '[]'::jsonb) || COALESCE(custom_phases_json, '[]'::jsonb);

  RETURN COALESCE(workflow_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
