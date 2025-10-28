-- Ensure proper storage policies for project-images bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access to project images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update project images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete project images" ON storage.objects;

-- Allow public read access to project images
CREATE POLICY "Public read access to project images"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-images');

-- Allow authenticated users to upload project images
CREATE POLICY "Authenticated users can upload project images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-images' AND auth.role() = 'authenticated');

-- Allow users to update their own project images
CREATE POLICY "Users can update project images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-images' AND auth.role() = 'authenticated');

-- Allow users to delete project images
CREATE POLICY "Users can delete project images"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-images' AND auth.role() = 'authenticated');