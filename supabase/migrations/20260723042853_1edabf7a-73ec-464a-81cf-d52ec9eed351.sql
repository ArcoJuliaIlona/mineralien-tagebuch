ALTER TABLE public.minerals
  ADD COLUMN IF NOT EXISTS crystal_system text,
  ADD COLUMN IF NOT EXISTS strunz_class text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS streak text,
  ADD COLUMN IF NOT EXISTS luster text;