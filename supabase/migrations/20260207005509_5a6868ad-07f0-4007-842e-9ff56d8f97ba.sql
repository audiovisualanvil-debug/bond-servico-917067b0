
-- Create storage bucket for service order photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for service photos
CREATE POLICY "Service photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-photos');

-- Authenticated users can upload photos
CREATE POLICY "Authenticated users can upload service photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-photos'
  AND auth.role() = 'authenticated'
);

-- Users can update their own uploads
CREATE POLICY "Users can update own service photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own uploads
CREATE POLICY "Users can delete own service photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
