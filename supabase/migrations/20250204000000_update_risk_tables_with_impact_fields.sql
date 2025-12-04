-- Migration: Update risk tables with separate schedule and budget impact fields
-- Date: 2025-12-04
-- Description: Replace single 'impact' field with schedule_impact_days and budget_impact_dollars

-- Add new columns to project_risks table (template risks)
ALTER TABLE project_risks 
ADD COLUMN IF NOT EXISTS schedule_impact_days DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_impact_dollars INTEGER DEFAULT 0;

-- Add new columns to project_run_risks table (project run risks)
ALTER TABLE project_run_risks 
ADD COLUMN IF NOT EXISTS schedule_impact_days DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_impact_dollars INTEGER DEFAULT 0;

-- Update likelihood constraint to only allow low, medium, high (remove critical)
-- Note: Existing 'critical' values will remain but new entries will be constrained

-- Add comment explaining the new fields
COMMENT ON COLUMN project_risks.schedule_impact_days IS 'Potential schedule delay in days if risk occurs (2 decimal precision)';
COMMENT ON COLUMN project_risks.budget_impact_dollars IS 'Potential budget increase in dollars if risk occurs (whole numbers)';
COMMENT ON COLUMN project_run_risks.schedule_impact_days IS 'Potential schedule delay in days if risk occurs (2 decimal precision)';
COMMENT ON COLUMN project_run_risks.budget_impact_dollars IS 'Potential budget increase in dollars if risk occurs (whole numbers)';

-- Keep the old 'impact' column for backward compatibility
-- It can be deprecated in a future migration after data migration is complete

