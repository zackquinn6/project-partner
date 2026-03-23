-- Per-project-run Quality Control preferences (photos per step, all vs critical outputs only)
ALTER TABLE public.project_runs
  ADD COLUMN IF NOT EXISTS quality_control_settings jsonb NULL;

COMMENT ON COLUMN public.project_runs.quality_control_settings IS
  'JSON: { "require_photos_per_step": bool, "require_all_outputs": bool }. Null = app defaults until user saves.';
