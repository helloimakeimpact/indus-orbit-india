-- Add category column as an alias to type for the new preference system
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill from type
UPDATE notifications SET category = type WHERE category IS NULL;

-- Create a trigger to keep them in sync going forward
CREATE OR REPLACE FUNCTION sync_notification_category()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.category IS NOT NULL AND NEW.type IS NULL THEN
    NEW.type := NEW.category;
  ELSIF NEW.type IS NOT NULL AND NEW.category IS NULL THEN
    NEW.category := NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_notification_category_trigger ON notifications;
CREATE TRIGGER sync_notification_category_trigger
  BEFORE INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION sync_notification_category();

