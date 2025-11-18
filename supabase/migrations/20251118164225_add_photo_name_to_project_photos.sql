-- Add photo_name column to project_photos table
ALTER TABLE public.project_photos
ADD COLUMN IF NOT EXISTS photo_name TEXT;

-- Add comment
COMMENT ON COLUMN public.project_photos.photo_name IS 'User-friendly name for the photo, defaults to filename without extension';

