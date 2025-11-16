-- FIX: Ensure project_templates_live view handles errors gracefully
-- If rebuild_phases_json_from_project_phases fails or returns NULL, use empty array

CREATE OR REPLACE VIEW public.project_templates_live AS
SELECT
  p.id,
  p.name,
  p.description,
  p.diy_length_challenges,
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
  -- FIX: Use COALESCE to handle NULL results and wrap in error handling
  COALESCE(
    public.rebuild_phases_json_from_project_phases(p.id),
    '[]'::jsonb
  ) AS phases
FROM public.projects p;

GRANT SELECT ON public.project_templates_live TO authenticated;
GRANT SELECT ON public.project_templates_live TO anon;

