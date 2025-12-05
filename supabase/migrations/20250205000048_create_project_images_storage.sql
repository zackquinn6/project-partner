-- =====================================================
-- CREATE STORAGE BUCKET FOR PROJECT IMAGES
-- =====================================================

-- Insert storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CREATE STORAGE POLICIES FOR PROJECT IMAGES
-- =====================================================

-- Allow authenticated users to upload project images
DROP POLICY IF EXISTS "Authenticated users can upload project images" ON storage.objects;
CREATE POLICY "Authenticated users can upload project images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-images' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to view project images
DROP POLICY IF EXISTS "Authenticated users can view project images" ON storage.objects;
CREATE POLICY "Authenticated users can view project images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-images' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to update project images
DROP POLICY IF EXISTS "Authenticated users can update project images" ON storage.objects;
CREATE POLICY "Authenticated users can update project images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-images' AND
    auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'project-images' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete project images
DROP POLICY IF EXISTS "Authenticated users can delete project images" ON storage.objects;
CREATE POLICY "Authenticated users can delete project images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-images' AND
    auth.role() = 'authenticated'
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ project-images storage bucket created';
  RAISE NOTICE '✅ Storage RLS policies applied for project-images';
END $$;

