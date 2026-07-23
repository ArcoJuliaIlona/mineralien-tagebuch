
ALTER TABLE public.minerals
  ADD COLUMN IF NOT EXISTS previous_owner text,
  ADD COLUMN IF NOT EXISTS acquired_at date,
  ADD COLUMN IF NOT EXISTS acquisition_type text,
  ADD COLUMN IF NOT EXISTS acquisition_price numeric,
  ADD COLUMN IF NOT EXISTS description text;
