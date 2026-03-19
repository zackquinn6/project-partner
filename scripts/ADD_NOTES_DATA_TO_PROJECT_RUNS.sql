-- Stores step-tagged free-form notes directly on `project_runs`
-- to avoid the missing/removed `public.project_notes` table.
--
-- Shape:
--   notes_data: { [stepId: string]: string }
--   e.g. { "step-123": "Remember to ..." }

ALTER TABLE public.project_runs
  ADD COLUMN IF NOT EXISTS notes_data JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.project_runs.notes_data IS
  'Step notes saved as JSONB mapping stepId -> note text for immediate autosave.';
