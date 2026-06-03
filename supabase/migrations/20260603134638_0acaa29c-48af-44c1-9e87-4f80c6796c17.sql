-- Switch trigger function to SECURITY INVOKER (RLS already restricts inserts to own rows)
CREATE OR REPLACE FUNCTION public.assign_mineral_collection_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.collection_number IS NULL OR NEW.collection_number = 0 THEN
    SELECT COALESCE(MAX(collection_number), 0) + 1
      INTO NEW.collection_number
    FROM public.minerals
    WHERE user_id = NEW.user_id AND category = NEW.category;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_mineral_collection_number() FROM PUBLIC, anon, authenticated;

-- Give column a default so Supabase types treat it as optional on insert
ALTER TABLE public.minerals
  ALTER COLUMN collection_number SET DEFAULT 0;
