-- Add collection_number (per user + per category) and value (€)
ALTER TABLE public.minerals
  ADD COLUMN collection_number INTEGER,
  ADD COLUMN value NUMERIC(12,2);

-- Backfill collection_number for existing rows per (user_id, category) by created_at
WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, category ORDER BY created_at, id) AS rn
  FROM public.minerals
)
UPDATE public.minerals m
SET collection_number = n.rn
FROM numbered n
WHERE m.id = n.id;

-- Trigger to auto-assign next collection_number per (user_id, category) on insert
CREATE OR REPLACE FUNCTION public.assign_mineral_collection_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.collection_number IS NULL THEN
    SELECT COALESCE(MAX(collection_number), 0) + 1
      INTO NEW.collection_number
    FROM public.minerals
    WHERE user_id = NEW.user_id AND category = NEW.category;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_mineral_collection_number
BEFORE INSERT ON public.minerals
FOR EACH ROW EXECUTE FUNCTION public.assign_mineral_collection_number();

ALTER TABLE public.minerals
  ALTER COLUMN collection_number SET NOT NULL;

CREATE UNIQUE INDEX minerals_user_category_number_unique
  ON public.minerals(user_id, category, collection_number);
