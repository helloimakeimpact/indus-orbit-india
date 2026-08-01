CREATE OR REPLACE FUNCTION sync_notification_category()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category IS NOT NULL AND NEW.type IS NULL THEN
    NEW.type := NEW.category;
  ELSIF NEW.type IS NOT NULL AND NEW.category IS NULL THEN
    NEW.category := NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

