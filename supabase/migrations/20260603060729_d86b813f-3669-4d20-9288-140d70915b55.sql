ALTER TABLE public.minerals
  ADD COLUMN category text NOT NULL DEFAULT 'mineral',
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision;

ALTER TABLE public.minerals
  ADD CONSTRAINT minerals_category_check
  CHECK (category IN ('mineral', 'fossil', 'rock'));

CREATE INDEX IF NOT EXISTS idx_minerals_user_category
  ON public.minerals (user_id, category);