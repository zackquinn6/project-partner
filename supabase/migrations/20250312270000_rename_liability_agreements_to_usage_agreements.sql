-- Rename liability_agreements to usage_agreements (Usage agreements in UI).
-- Add agreement_type (liability | membership). Ensure PDF path is stored.

-- 1. Rename table
ALTER TABLE IF EXISTS liability_agreements
  RENAME TO usage_agreements;

-- 2. Add agreement_type: liability or membership (existing rows = liability)
ALTER TABLE usage_agreements
  ADD COLUMN IF NOT EXISTS agreement_type text;

UPDATE usage_agreements
SET agreement_type = 'liability'
WHERE agreement_type IS NULL;

ALTER TABLE usage_agreements
  ALTER COLUMN agreement_type SET NOT NULL,
  ALTER COLUMN agreement_type SET DEFAULT 'liability';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usage_agreements_agreement_type_check'
  ) THEN
    ALTER TABLE usage_agreements
      ADD CONSTRAINT usage_agreements_agreement_type_check
      CHECK (agreement_type IN ('liability', 'membership'));
  END IF;
END $$;

-- 3. Ensure pdf_storage_path exists (storage path for signed PDF; link = bucket + path)
ALTER TABLE usage_agreements
  ADD COLUMN IF NOT EXISTS pdf_storage_path text;

COMMENT ON TABLE usage_agreements IS 'Usage agreements: liability and membership. Each row is one user acceptance; pdf_storage_path is the storage path for the signed PDF.';
COMMENT ON COLUMN usage_agreements.agreement_type IS 'Type of agreement: liability or membership.';
COMMENT ON COLUMN usage_agreements.pdf_storage_path IS 'Storage path (bucket-relative) for the signed PDF document.';
