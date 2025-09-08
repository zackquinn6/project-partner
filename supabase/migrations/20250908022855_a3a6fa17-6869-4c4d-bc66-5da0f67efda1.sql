-- Create storage bucket for home photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('home-photos', 'home-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for home photos bucket
CREATE POLICY "Users can view home photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'home-photos');

CREATE POLICY "Users can upload their own home photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'home-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own home photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'home-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own home photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'home-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);