-- Fix function overload issue: get_project_workflow_with_standards calling rebuild_phases_json_from_project_phases
-- The function now has 2 parameters (p_project_id, p_default_skill_level), but calls were using 1 parameter
-- This causes PostgreSQL to not know which overload to use

-- First, drop any old versions of the function that might have only 1 parameter
-- This ensures we only have the 2-parameter version
DROP FUNCTION IF EXISTS public.rebuild_phases_json_from_project_phases(UUID);

-- Update get_project_workflow_with_standards to explicitly pass NULL for the optional parameter
CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(p_project_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- Explicitly call rebuild_phases_json_from_project_phases with 2 parameters
  -- Pass NULL for p_default_skill_level to use the function's default behavior
  RETURN COALESCE(
    public.rebuild_phases_json_from_project_phases(p_project_id, NULL),
    '[]'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Also update project_templates_live view to use the correct function signature
CREATE OR REPLACE VIEW public.project_templates_live AS
SELECT
  p.id,
  p.name,
  p.description,
  p.project_challenges,
  p.image,
  p.images,
  p.cover_image,
  p.category,
  p.difficulty,
  p.effort_level,
  p.skill_level,
  p.estimated_time,
  p.estimated_time_per_unit,
  p.scaling_unit,
  p.publish_status,
  p.published_at,
  p.beta_released_at,
  p.archived_at,
  p.release_notes,
  p.revision_notes,
  p.revision_number,
  p.parent_project_id,
  p.created_from_revision,
  p.is_standard_template,
  p.is_current_version,
  p.phase_revision_alerts,
  p.owner_id,
  p.created_by,
  p.created_at,
  p.updated_at,
  p.start_date,
  p.plan_end_date,
  p.end_date,
  p.estimated_total_time,
  p.typical_project_size,
  COALESCE(
    public.rebuild_phases_json_from_project_phases(p.id, NULL),
    '[]'::jsonb
  ) AS phases
FROM public.projects p;

GRANT SELECT ON public.project_templates_live TO authenticated;
GRANT SELECT ON public.project_templates_live TO anon;

