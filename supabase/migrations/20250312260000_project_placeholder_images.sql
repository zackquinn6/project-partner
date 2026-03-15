-- Ensure every project has a cover_image (and images array) for display in catalog/cards.
-- Uses deterministic placeholder URLs (Picsum Photos, free to use) so each project gets a stable image by id.
-- You can replace these later with real images via the app (ProjectImageManager) or storage.

-- Add columns if they don't exist (no-op if already present)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cover_image text;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS images text[];

-- Set placeholder cover_image and ensure images has at least one entry for rows that have no cover
UPDATE projects
SET
  cover_image = 'https://picsum.photos/seed/' || id || '/800/600',
  images = CASE
    WHEN images IS NULL OR array_length(images, 1) IS NULL THEN
      ARRAY['https://picsum.photos/seed/' || id || '/800/600']::text[]
    ELSE
      images
  END
WHERE cover_image IS NULL OR trim(COALESCE(cover_image, '')) = '';

COMMENT ON COLUMN projects.cover_image IS 'URL of the main image for the project (catalog/cards).';
COMMENT ON COLUMN projects.images IS 'Array of image URLs for the project.';
