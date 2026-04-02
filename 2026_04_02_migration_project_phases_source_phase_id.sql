-- Link incorporated phases to the source template phase by UUID so renames and latest-revision
-- resolution do not rely on matching phase names.

ALTER TABLE public.project_phases
  ADD COLUMN IF NOT EXISTS source_phase_id uuid REFERENCES public.project_phases (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.project_phases.source_phase_id IS
  'For incorporated phases (source_project_id set): the project_phases.id in the source template whose operations/steps should be shown. Survives renames; UI resolves to the latest revision in the source family when the anchor row is on an older project revision.';

CREATE INDEX IF NOT EXISTS project_phases_source_phase_id_idx
  ON public.project_phases (source_phase_id)
  WHERE source_phase_id IS NOT NULL;

-- Best-effort backfill for rows created before this column existed (same source project + name at migration time).
UPDATE public.project_phases pp_inc
SET source_phase_id = pp_src.id
FROM public.project_phases pp_src
WHERE pp_inc.source_project_id IS NOT NULL
  AND pp_inc.source_phase_id IS NULL
  AND pp_src.project_id = pp_inc.source_project_id
  AND pp_src.name = pp_inc.name
  AND (pp_src.is_standard IS DISTINCT FROM true);
