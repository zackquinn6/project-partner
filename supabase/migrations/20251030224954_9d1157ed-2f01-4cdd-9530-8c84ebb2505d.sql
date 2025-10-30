-- Make template_id nullable for manual project entries
ALTER TABLE project_runs 
ALTER COLUMN template_id DROP NOT NULL;

-- Add a check constraint to ensure either template_id is set OR is_manual_entry is true
ALTER TABLE project_runs 
ADD CONSTRAINT manual_or_template_check 
CHECK (template_id IS NOT NULL OR is_manual_entry = true);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_runs_manual_entry 
ON project_runs(is_manual_entry) 
WHERE is_manual_entry = true;