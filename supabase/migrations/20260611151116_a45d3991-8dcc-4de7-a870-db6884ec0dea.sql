CREATE POLICY "Users can update own mineral photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'mineral-photos' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'mineral-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own mineral videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'mineral-videos' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'mineral-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);