-- Allow Privacy Policy to be stored and edited via Agreement Templates & Policies (admin).
-- agreement_templates.type is text; supported values: liability, membership, project_owner, privacy.
-- No schema change required; this documents the type for the new Privacy Policy template.

COMMENT ON TABLE agreement_templates IS 'Versioned templates for agreements and policies. type: liability (Usage Agreement), membership (Membership Agreement), project_owner (Project Owner Agreement), privacy (Privacy Policy).';
