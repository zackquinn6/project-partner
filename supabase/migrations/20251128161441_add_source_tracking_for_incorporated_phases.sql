-- Migration: Add source tracking fields for incorporated phases
-- This enables dynamic linking of incorporated phases (like standard phases)

BEGIN;

-- Add source tracking fields to project_phases
ALTER TABLE public.project_phases
ADD COLUMN IF NOT EXISTS source_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_phase_id UUID REFERENCES public.project_phases(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_phases_source_project_id ON public.project_phases(source_project_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_source_phase_id ON public.project_phases(source_phase_id);

COMMENT ON COLUMN public.project_phases.source_project_id IS 'For incorporated phases: ID of the source project this phase is linked from';
COMMENT ON COLUMN public.project_phases.source_phase_id IS 'For incorporated phases: ID of the source phase in the source project';

COMMIT;

