-- (d) Each project assigned as owner can have its own project owner agreement.
-- Add project_id to usage_agreements so we can store one agreement per (user, project) for agreement_type = 'project_owner'.
-- (e) Agreement templates: type 'project_owner' is used by the Agreements tab (agreement_templates.type is text; no constraint change).

ALTER TABLE usage_agreements
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

COMMENT ON COLUMN usage_agreements.project_id IS 'When agreement_type = project_owner, the project this agreement applies to. One agreement per (user_id, project_id) for project owners.';
