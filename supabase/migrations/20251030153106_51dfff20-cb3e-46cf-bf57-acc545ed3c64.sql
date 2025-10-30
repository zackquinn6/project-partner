-- Phase 2: Database Schema Changes - Allow NULL standard_phase_id and add custom phase support

-- 1. Make standard_phase_id nullable
ALTER TABLE template_operations 
ALTER COLUMN standard_phase_id DROP NOT NULL;

-- 2. Add custom phase metadata columns
ALTER TABLE template_operations
ADD COLUMN IF NOT EXISTS custom_phase_name TEXT,
ADD COLUMN IF NOT EXISTS custom_phase_description TEXT,
ADD COLUMN IF NOT EXISTS custom_phase_display_order INTEGER;

-- 3. Add computed column for easy identification
ALTER TABLE template_operations
ADD COLUMN IF NOT EXISTS is_custom_phase BOOLEAN 
GENERATED ALWAYS AS (standard_phase_id IS NULL) STORED;

-- 4. Add check constraint: either standard OR custom, not both
ALTER TABLE template_operations
DROP CONSTRAINT IF EXISTS custom_phase_metadata_check;

ALTER TABLE template_operations
ADD CONSTRAINT custom_phase_metadata_check
CHECK (
  (standard_phase_id IS NOT NULL AND custom_phase_name IS NULL) OR
  (standard_phase_id IS NULL AND custom_phase_name IS NOT NULL)
);

-- 5. Add index for performance
CREATE INDEX IF NOT EXISTS idx_template_operations_custom_phase 
ON template_operations(custom_phase_name) 
WHERE standard_phase_id IS NULL;