-- Ensure project_challenges column exists by renaming diy_length_challenges if needed
-- This migration is idempotent and will only run if the column rename hasn't happened yet

-- Rename diy_length_challenges to project_challenges in projects table (idempotent)
DO $$ 
BEGIN
  -- Check if old column exists and new column doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'diy_length_challenges'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'project_challenges'
  ) THEN
    ALTER TABLE public.projects 
      RENAME COLUMN diy_length_challenges TO project_challenges;
    RAISE NOTICE 'Renamed diy_length_challenges to project_challenges in projects table';
  ELSE
    RAISE NOTICE 'Column rename not needed in projects table (already renamed or column does not exist)';
  END IF;
END $$;

-- Rename diy_length_challenges to project_challenges in project_runs table (idempotent)
DO $$ 
BEGIN
  -- Check if old column exists and new column doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'project_runs' 
    AND column_name = 'diy_length_challenges'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'project_runs' 
    AND column_name = 'project_challenges'
  ) THEN
    ALTER TABLE public.project_runs 
      RENAME COLUMN diy_length_challenges TO project_challenges;
    RAISE NOTICE 'Renamed diy_length_challenges to project_challenges in project_runs table';
  ELSE
    RAISE NOTICE 'Column rename not needed in project_runs table (already renamed or column does not exist)';
  END IF;
END $$;

-- Drop and recreate project_templates_live view to use new column name
-- We need to drop first because the view may still reference the old column name
DROP VIEW IF EXISTS public.project_templates_live;

CREATE VIEW public.project_templates_live AS
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
  COALESCE(
    public.rebuild_phases_json_from_project_phases(p.id),
    '[]'::jsonb
  ) AS phases
FROM public.projects p;

GRANT SELECT ON public.project_templates_live TO authenticated;
GRANT SELECT ON public.project_templates_live TO anon;

