-- Add is_current_version so create_project_revision_v2 can set/clear it when creating draft revisions.
-- The RPC uses this column to mark which revision is "current" within a revision chain.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_current_version boolean DEFAULT true;

-- Backfill: one "current" per revision chain.
-- Revisions (have parent): current = true only for the row with max revision_number in that chain.
UPDATE public.projects p
SET is_current_version = (
  p.revision_number = (
    SELECT MAX(p2.revision_number)
    FROM public.projects p2
    WHERE p2.parent_project_id = p.parent_project_id
  )
)
WHERE p.parent_project_id IS NOT NULL;

-- Roots with no children: keep current. Roots that are parents of revisions: not current (latest child is).
UPDATE public.projects
SET is_current_version = CASE
  WHEN id IN (SELECT parent_project_id FROM public.projects WHERE parent_project_id IS NOT NULL) THEN false
  ELSE true
END
WHERE parent_project_id IS NULL;

COMMENT ON COLUMN public.projects.is_current_version IS 'True for the current revision in a chain; used by create_project_revision_v2.';
