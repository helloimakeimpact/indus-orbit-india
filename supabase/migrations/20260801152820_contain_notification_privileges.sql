-- Contain the inherited notification surface without breaking the current
-- browser callers of public.send_notification(). Event-specific notification
-- contracts and the private delivery outbox are a separate cutover.

-- Notification rows are private member data. Anonymous clients have no reason
-- to reach this table, and authenticated clients only need to read their rows
-- and update the read marker.
REVOKE ALL PRIVILEGES ON TABLE public.notifications FROM PUBLIC, anon;
REVOKE ALL PRIVILEGES ON TABLE public.notifications FROM authenticated;

GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (is_read) ON TABLE public.notifications TO authenticated;

DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read/update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Members read own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid()) = user_id
);

CREATE POLICY "Members mark own notifications read"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid()) = user_id
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND (SELECT auth.uid()) = user_id
);

CREATE INDEX IF NOT EXISTS notifications_user_created_at_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_created_at_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- This row-local compatibility trigger does not require definer privileges.
-- The empty search path removes name-resolution ambiguity.
CREATE OR REPLACE FUNCTION public.sync_notification_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
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

-- This helper must retain definer privileges because its trigger fans an
-- untargeted vouch request out to administrators. It is not a client RPC.
CREATE OR REPLACE FUNCTION public.notify_admins_on_open_vouch_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.target_verifier_id IS NULL THEN
    INSERT INTO public.notifications (user_id, type, message, link)
    SELECT
      roles.user_id,
      'vouch_request_admin',
      'A member is asking for verification.',
      '/app/admin/vouches'
    FROM public.user_roles AS roles
    WHERE roles.role = 'admin'::public.app_role;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger execution is not a browser permission. Remove direct invocation of
-- both trigger helpers while leaving their existing triggers intact.
REVOKE EXECUTE ON FUNCTION public.sync_notification_category() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_on_open_vouch_request()
  FROM PUBLIC, anon, authenticated;

-- DEPRECATED / HIGH RISK: this compatibility RPC still accepts a caller-chosen
-- recipient, type, message, and link. It remains executable by authenticated
-- clients only so the current member application does not break before the
-- event-specific notification and outbox cutover.
CREATE OR REPLACE FUNCTION public.send_notification(
  _user_id uuid,
  _type text,
  _message text,
  _link text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _user_id IS NULL OR _type IS NULL OR _message IS NULL THEN
    RAISE EXCEPTION 'Missing required notification fields';
  END IF;

  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (_user_id, _type, _message, _link)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.send_notification(uuid, text, text, text) IS
  'DEPRECATED / HIGH RISK compatibility RPC. Authenticated callers can still choose the recipient and content until event-specific notification contracts and the private outbox replace all legacy callers.';
