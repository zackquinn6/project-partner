-- Update liability_agreements: drop full_name, policy_text_snapshot, and policy_version.
-- Full name will be sourced from user_profiles; the agreement text is stored as a PDF in storage.

ALTER TABLE liability_agreements
  DROP COLUMN IF EXISTS full_name,
  DROP COLUMN IF EXISTS policy_text_snapshot,
  DROP COLUMN IF EXISTS policy_version;

