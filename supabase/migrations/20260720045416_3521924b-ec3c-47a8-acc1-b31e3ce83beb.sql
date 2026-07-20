ALTER TABLE public.minerals
  ADD COLUMN IF NOT EXISTS storage_floor text,
  ADD COLUMN IF NOT EXISTS storage_cabinet text,
  ADD COLUMN IF NOT EXISTS storage_shelf text;