-- Create project_photos table for storing user project photos
CREATE TABLE public.project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_run_id UUID NOT NULL REFERENCES public.project_runs(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  step_id TEXT NOT NULL, -- Step ID from the workflow
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL, -- Size in bytes
  privacy_level TEXT NOT NULL DEFAULT 'project_partner' CHECK (privacy_level IN ('personal', 'project_partner', 'public')),
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_project_photos_user_id ON public.project_photos(user_id);
CREATE INDEX idx_project_photos_project_run_id ON public.project_photos(project_run_id);
CREATE INDEX idx_project_photos_template_id ON public.project_photos(template_id);
CREATE INDEX idx_project_photos_step_id ON public.project_photos(step_id);
CREATE INDEX idx_project_photos_privacy_level ON public.project_photos(privacy_level);
CREATE INDEX idx_project_photos_created_at ON public.project_photos(created_at DESC);

-- Enable RLS
ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can always view their own photos (all privacy levels)
CREATE POLICY "Users can view their own photos" 
  ON public.project_photos 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy 2: Users can upload photos to their own projects
CREATE POLICY "Users can upload their own photos" 
  ON public.project_photos 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own photos (caption, privacy level)
CREATE POLICY "Users can update their own photos" 
  ON public.project_photos 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy 4: Users can delete their own photos
CREATE POLICY "Users can delete their own photos" 
  ON public.project_photos 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Policy 5: Admins can view project_partner and public photos (not personal)
CREATE POLICY "Admins can view project_partner and public photos" 
  ON public.project_photos 
  FOR SELECT 
  USING (
    privacy_level IN ('project_partner', 'public') 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy 6: Public photos are visible to all authenticated users
CREATE POLICY "Public photos are visible to all" 
  ON public.project_photos 
  FOR SELECT 
  USING (privacy_level = 'public' AND auth.uid() IS NOT NULL);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_project_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_project_photos_updated_at
BEFORE UPDATE ON public.project_photos
FOR EACH ROW
EXECUTE FUNCTION public.update_project_photos_updated_at();

-- Create storage bucket for project photos (if not exists)
-- This will be done via Supabase dashboard or SQL
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-photos',
  'project-photos',
  false, -- Not public by default, access controlled via policies
  5242880, -- 5MB limit in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-photos bucket
-- Policy 1: Users can upload to their own folder
CREATE POLICY "Users can upload their own project photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can view their own photos
CREATE POLICY "Users can view their own project photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Admins can view project_partner and public photos
-- This requires checking the project_photos table for privacy level
CREATE POLICY "Admins can view project partner photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-photos' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
  AND EXISTS (
    SELECT 1 FROM public.project_photos 
    WHERE project_photos.storage_path = name 
    AND project_photos.privacy_level IN ('project_partner', 'public')
  )
);

-- Policy 4: Public photos are visible to all authenticated users
CREATE POLICY "Public photos visible to all"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-photos'
  AND EXISTS (
    SELECT 1 FROM public.project_photos 
    WHERE project_photos.storage_path = name 
    AND project_photos.privacy_level = 'public'
  )
);

-- Policy 5: Users can delete their own photos
CREATE POLICY "Users can delete their own project photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Function to get photo count by project type (for admin analytics)
CREATE OR REPLACE FUNCTION public.get_photos_by_project_type()
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  photo_count BIGINT,
  public_count BIGINT,
  project_partner_count BIGINT,
  personal_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as template_id,
    p.name as template_name,
    COUNT(pp.id) as photo_count,
    COUNT(CASE WHEN pp.privacy_level = 'public' THEN 1 END) as public_count,
    COUNT(CASE WHEN pp.privacy_level = 'project_partner' THEN 1 END) as project_partner_count,
    COUNT(CASE WHEN pp.privacy_level = 'personal' THEN 1 END) as personal_count
  FROM public.projects p
  LEFT JOIN public.project_photos pp ON pp.template_id = p.id
  WHERE p.is_standard_template = false
  GROUP BY p.id, p.name
  ORDER BY photo_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

