
CREATE TABLE public.minerals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mineral_name TEXT NOT NULL,
  companion_minerals TEXT,
  location TEXT,
  collection_name TEXT,
  photo_paths TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_minerals_user ON public.minerals(user_id);
CREATE INDEX idx_minerals_name ON public.minerals(user_id, mineral_name);
CREATE INDEX idx_minerals_location ON public.minerals(user_id, location);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.minerals TO authenticated;
GRANT ALL ON public.minerals TO service_role;

ALTER TABLE public.minerals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own minerals" ON public.minerals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own minerals" ON public.minerals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own minerals" ON public.minerals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own minerals" ON public.minerals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_minerals_updated_at
BEFORE UPDATE ON public.minerals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for the mineral-photos bucket (created via tool)
CREATE POLICY "Users read own photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mineral-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mineral-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mineral-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
