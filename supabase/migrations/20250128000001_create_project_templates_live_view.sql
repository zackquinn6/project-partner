-- Create project_templates_live view that shows only the latest published revisions
-- This view filters projects to show:
-- 1. Only published or beta-testing projects
-- 2. Only the latest revision of each project
-- 3. Excludes projects with no published revisions
-- 4. Excludes standard templates

-- Drop the view if it exists
DROP VIEW IF EXISTS public.project_templates_live CASCADE;

-- Create the view
CREATE VIEW public.project_templates_live AS
WITH project_families AS (
  -- Identify all project families (parent projects and their revisions)
  SELECT DISTINCT
    COALESCE(parent_project_id, id) AS project_family_id,
    id AS project_id
  FROM public.projects
  WHERE 
    (is_standard_template IS NULL OR is_standard_template = false)
    AND publish_status != 'archived'
),
latest_published AS (
  -- For each project family, find the latest published revision
  SELECT DISTINCT ON (pf.project_family_id)
    p.*
  FROM project_families pf
  INNER JOIN public.projects p ON p.id = pf.project_id
  WHERE 
    p.publish_status IN ('published', 'beta-testing')
    AND (p.is_standard_template IS NULL OR p.is_standard_template = false)
  ORDER BY 
    pf.project_family_id,
    -- Prioritize revisions over parent projects (if revision_number is NULL, it's a parent)
    CASE WHEN p.parent_project_id IS NULL THEN 0 ELSE 1 END,
    -- Then by highest revision number
    COALESCE(p.revision_number, 0) DESC,
    -- Then by most recent update
    p.updated_at DESC NULLS LAST
)
-- Return all columns from the latest published project/revision for each family
SELECT 
  lp.id,
  lp.name,
  lp.description,
  lp.category,
  lp.difficulty,
  lp.effort_level,
  lp.skill_level,
  lp.estimated_time,
  lp.estimated_time_per_unit,
  lp.typical_project_size,
  lp.scaling_unit,
  lp.item_type,
  lp.project_type,
  lp.project_challenges,
  lp.image,
  lp.images,
  lp.cover_image,
  lp.publish_status,
  lp.published_at,
  lp.beta_released_at,
  lp.is_standard_template,
  lp.is_current_version,
  lp.parent_project_id,
  lp.revision_number,
  lp.revision_notes,
  lp.release_notes,
  lp.created_from_revision,
  lp.phase_revision_alerts,
  lp.phases,
  lp.created_at,
  lp.updated_at,
  lp.created_by,
  lp.owner_id,
  lp.start_date,
  lp.plan_end_date,
  lp.end_date,
  lp.archived_at
FROM latest_published lp;

-- Add comment
COMMENT ON VIEW public.project_templates_live IS 
'View that shows only the latest published revisions of projects.
Excludes projects with no published revisions and standard templates.
Shows only published or beta-testing projects with the highest revision_number.';

-- Grant permissions (adjust as needed for your RLS policies)
GRANT SELECT ON public.project_templates_live TO authenticated;
GRANT SELECT ON public.project_templates_live TO anon;

