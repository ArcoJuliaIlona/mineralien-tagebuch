ALTER TABLE public.minerals ADD COLUMN country text;
GRANT SELECT, INSERT, UPDATE ON public.minerals TO authenticated;
GRANT ALL ON public.minerals TO service_role;