
ALTER TABLE public.minerals ADD COLUMN IF NOT EXISTS video_paths text[] NOT NULL DEFAULT '{}';

CREATE POLICY "Users read own videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'mineral-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mineral-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'mineral-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);
