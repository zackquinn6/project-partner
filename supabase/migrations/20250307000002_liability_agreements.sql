-- Liability agreement acceptance: one row per user acceptance; stores PDF for legal record.
CREATE TABLE IF NOT EXISTS public.liability_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  agreed_at timestamptz NOT NULL DEFAULT now(),
  policy_version text,
  policy_text_snapshot text,
  pdf_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_liability_agreements_user_id ON public.liability_agreements(user_id);

ALTER TABLE public.liability_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own liability agreement"
  ON public.liability_agreements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own liability agreement"
  ON public.liability_agreements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No update/delete: acceptance is immutable for legal record.

COMMENT ON TABLE public.liability_agreements IS 'Liability policy acceptance required to use the app; stores PDF path for legal record.';

-- Storage bucket for liability PDFs (private; only owner and service role can read).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'liability-pdfs',
  'liability-pdfs',
  false,
  5242880,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own liability PDF"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'liability-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own liability PDF"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'liability-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]
  );
