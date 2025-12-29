-- Create storage bucket for family member avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('family-avatars', 'family-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for users to upload their own avatars
CREATE POLICY "Users can upload family avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'family-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to update their own avatars
CREATE POLICY "Users can update family avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'family-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to delete their own avatars
CREATE POLICY "Users can delete family avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'family-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to avatars
CREATE POLICY "Anyone can view family avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'family-avatars');