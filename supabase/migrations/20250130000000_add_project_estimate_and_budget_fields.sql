-- Migration: Add project estimate and budget fields to projects table
-- All fields are TEXT type to match existing estimated_time field pattern
-- Default to NULL, no constraints

-- Add estimated_total_time (total time for typical project size)
-- Example: "40-60 hours"
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS estimated_total_time TEXT;

-- Add typical_project_size (size used for estimated total time)
-- Example: 100 (numeric value)
-- Note: Keep as numeric type - do not convert to text
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS typical_project_size NUMERIC;

-- Add budget_per_unit (estimated cost per scaling unit)
-- Example: "5.00" or "$5.00 per sqft"
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS budget_per_unit TEXT;

-- Add budget_per_typical_size (total estimated cost for typical project size)
-- Example: "500.00" or "$500.00"
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS budget_per_typical_size TEXT;

-- Add comment to document the fields
COMMENT ON COLUMN projects.estimated_total_time IS 'Total estimated time for typical project size (e.g., "40-60 hours")';
COMMENT ON COLUMN projects.typical_project_size IS 'Typical project size used for estimated total time (numeric value, e.g., 100)';
COMMENT ON COLUMN projects.budget_per_unit IS 'Estimated cost per scaling unit (e.g., "$5.00 per sqft")';
COMMENT ON COLUMN projects.budget_per_typical_size IS 'Total estimated cost for typical project size (e.g., "$500.00")';

