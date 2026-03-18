-- Remove duplicative source_project_name from project_phases.
-- Root cause: project_phases.source_project_id already links to projects(id),
-- so the name should be resolved through the relationship, not duplicated.

ALTER TABLE public.project_phases
  DROP COLUMN IF EXISTS source_project_name;

