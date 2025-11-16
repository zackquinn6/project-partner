-- Add missing RPC function that the frontend useDynamicPhases hook expects
CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(p_project_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- Return the phases JSON from rebuild_phases_json_from_project_phases
  -- This already handles standard operations via source_operation_id
  RETURN COALESCE(
    public.rebuild_phases_json_from_project_phases(p_project_id),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

