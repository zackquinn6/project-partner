-- Fix project_templates_live view to use parent project images
-- Images and project info should be shared across all revisions
-- Always display images from the parent project (or self if no parent)

-- Drop view first to avoid column name conflicts
DROP VIEW IF EXISTS public.project_templates_live;

CREATE VIEW public.project_templates_live AS
SELECT
  p.id,
  p.name,
  p.description,
  p.project_challenges,
  p.project_type,
  -- Always use parent project's images if parent exists (shared across all revisions)
  -- For projects without a parent (original projects), use their own images
  -- This ensures images are consistent across all revisions
  CASE 
    WHEN p.parent_project_id IS NOT NULL THEN COALESCE(parent.image, parent.cover_image, (CASE WHEN parent.images IS NOT NULL AND array_length(parent.images, 1) > 0 THEN parent.images[1] ELSE NULL END))
    ELSE p.image
  END AS image,
  CASE 
    WHEN p.parent_project_id IS NOT NULL THEN parent.images
    ELSE p.images
  END AS images,
  CASE 
    WHEN p.parent_project_id IS NOT NULL THEN parent.cover_image
    ELSE p.cover_image
  END AS cover_image,
  p.category,
  p.difficulty,
  p.effort_level,
  p.skill_level,
  p.estimated_time,
  p.estimated_time_per_unit,
  p.scaling_unit,
  p.item_type,
  -- Also use parent project's estimated_total_time and typical_project_size if current doesn't have them
  COALESCE(
    p.estimated_total_time,
    parent.estimated_total_time
  ) AS estimated_total_time,
  COALESCE(
    p.typical_project_size,
    parent.typical_project_size
  ) AS typical_project_size,
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
  COALESCE(
    public.rebuild_phases_json_from_project_phases(p.id, NULL),
    '[]'::jsonb
  ) AS phases
FROM public.projects p
LEFT JOIN public.projects parent ON parent.id = p.parent_project_id;

GRANT SELECT ON public.project_templates_live TO authenticated;
GRANT SELECT ON public.project_templates_live TO anon;

COMMENT ON VIEW public.project_templates_live IS 
'Live view of project templates. Images and project info (estimated_total_time, typical_project_size) are inherited from parent project to ensure consistency across revisions.';

