-- Add alternates column to tools table
ALTER TABLE tools ADD COLUMN IF NOT EXISTS alternates text;

-- Add alternates column to materials table  
ALTER TABLE materials ADD COLUMN IF NOT EXISTS alternates text;

COMMENT ON COLUMN tools.alternates IS 'JSON string array of alternate items - can be single items or groups of items';
COMMENT ON COLUMN materials.alternates IS 'JSON string array of alternate items - can be single items or groups of items';