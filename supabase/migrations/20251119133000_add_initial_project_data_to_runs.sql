-- Add initial project data columns to project_runs table
-- These fields capture user input during project kickoff step 3

ALTER TABLE project_runs
ADD COLUMN initial_budget TEXT,
ADD COLUMN initial_timeline DATE,
ADD COLUMN initial_sizing TEXT;

-- Add comments for documentation
COMMENT ON COLUMN project_runs.initial_budget IS 'Initial budget estimate entered by user during project kickoff';
COMMENT ON COLUMN project_runs.initial_timeline IS 'Target completion date entered by user during project kickoff (defaults to 2 weeks in future)';
COMMENT ON COLUMN project_runs.initial_sizing IS 'Project size/scale entered by user during project kickoff (free text field)';

