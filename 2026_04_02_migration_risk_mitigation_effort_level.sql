-- Relative effort to implement mitigations (admin template); copied to project_run_risks for Risk-Less ordering.

ALTER TABLE project_risks
  ADD COLUMN IF NOT EXISTS mitigation_effort_level text;

ALTER TABLE project_risks
  DROP CONSTRAINT IF EXISTS project_risks_mitigation_effort_level_check;

ALTER TABLE project_risks
  ADD CONSTRAINT project_risks_mitigation_effort_level_check
  CHECK (mitigation_effort_level IS NULL OR mitigation_effort_level IN ('low', 'medium', 'high'));

ALTER TABLE project_run_risks
  ADD COLUMN IF NOT EXISTS mitigation_effort_level text;

ALTER TABLE project_run_risks
  DROP CONSTRAINT IF EXISTS project_run_risks_mitigation_effort_level_check;

ALTER TABLE project_run_risks
  ADD CONSTRAINT project_run_risks_mitigation_effort_level_check
  CHECK (mitigation_effort_level IS NULL OR mitigation_effort_level IN ('low', 'medium', 'high'));

COMMENT ON COLUMN project_risks.mitigation_effort_level IS
  'Admin: effort to carry out mitigation (low/medium/high); used for Risk-Less “easiest mitigation first” ordering.';

COMMENT ON COLUMN project_run_risks.mitigation_effort_level IS
  'Copied from template project_risks; used for Risk-Less register ordering.';
