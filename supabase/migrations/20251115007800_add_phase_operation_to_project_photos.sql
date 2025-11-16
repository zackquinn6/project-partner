-- Add phase_id and operation_id to project_photos table
-- This allows tracking where in the project workflow each photo was uploaded

ALTER TABLE public.project_photos
ADD COLUMN IF NOT EXISTS phase_id TEXT,
ADD COLUMN IF NOT EXISTS operation_id TEXT,
ADD COLUMN IF NOT EXISTS phase_name TEXT,
ADD COLUMN IF NOT EXISTS operation_name TEXT,
ADD COLUMN IF NOT EXISTS step_name TEXT;

-- Create indexes for faster lookups by phase/operation
CREATE INDEX IF NOT EXISTS idx_project_photos_phase_id ON public.project_photos(phase_id);
CREATE INDEX IF NOT EXISTS idx_project_photos_operation_id ON public.project_photos(operation_id);

COMMENT ON COLUMN public.project_photos.phase_id IS 'ID of the phase where the photo was uploaded';
COMMENT ON COLUMN public.project_photos.operation_id IS 'ID of the operation where the photo was uploaded';
COMMENT ON COLUMN public.project_photos.phase_name IS 'Name of the phase (denormalized for display)';
COMMENT ON COLUMN public.project_photos.operation_name IS 'Name of the operation (denormalized for display)';
COMMENT ON COLUMN public.project_photos.step_name IS 'Name of the step (denormalized for display)';

