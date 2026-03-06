-- Add owned_materials to profiles for tools/materials library (matches owned_tools pattern).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS owned_materials jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN profiles.owned_materials IS 'JSONB array of user-owned materials in the tools/materials library.';
