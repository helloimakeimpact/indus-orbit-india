-- 1) Newsletter subscriptions: drop broad authenticated read
DROP POLICY IF EXISTS "Authenticated users can read newsletter subscriptions" ON public.newsletter_subscriptions;

-- 2) Contact submissions: drop broad authenticated read
DROP POLICY IF EXISTS "Authenticated users can read contact submissions" ON public.contact_submissions;

-- 3) Notifications: restrict client inserts to self; add SECURITY DEFINER helper for server-side fan-out
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.send_notification(
  _user_id uuid,
  _type text,
  _message text,
  _link text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
REVOKE EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text) TO authenticated;

-- 4) Vouch codes: only the active code's eventual redeemer (caller) can claim it
DROP POLICY IF EXISTS "Redeemer can update code" ON public.vouch_codes;
CREATE POLICY "Redeemer can claim active code"
ON public.vouch_codes
FOR UPDATE
TO authenticated
USING (status = 'active' AND redeemer_id IS NULL AND issuer_id <> auth.uid())
WITH CHECK (status = 'redeemed' AND redeemer_id = auth.uid());

-- 5) Vouch events: only update unassigned events to claim yourself; never re-assign others
DROP POLICY IF EXISTS "Redeemer updates events" ON public.vouch_events;
CREATE POLICY "Claim unassigned vouch event"
ON public.vouch_events
FOR UPDATE
TO authenticated
USING (recipient_id IS NULL OR recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- 6) Profile notification_prefs: hide from anonymous visitors
REVOKE SELECT (notification_prefs) ON public.profiles FROM anon;

-- 7) Fix function search_path
ALTER FUNCTION public.vouch_role_overrides_set_key() SET search_path = public;

-- 8) Lock SECURITY DEFINER helpers so they aren't callable by anon / public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_suspended(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_suspended(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_chapter_lead(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_chapter_lead(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_mission_lead(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_mission_lead(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.vouch_remaining(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vouch_remaining(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.vouch_effective_quota(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vouch_effective_quota(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.vouch_used_in_window(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vouch_used_in_window(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.lookup_vouch_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_vouch_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.my_lead_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_lead_summary() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_connection_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_connection_email(uuid) TO authenticated;

-- 9) Realtime: only sender/recipient can subscribe to a direct-message conversation channel
-- Channel topic convention: 'dm:<user_a>:<user_b>' (sorted)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DM participants can subscribe" ON realtime.messages;
CREATE POLICY "DM participants can subscribe"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow only if topic encodes the caller's uid as a participant
  (realtime.topic() LIKE 'dm:%' AND position(auth.uid()::text in realtime.topic()) > 0)
  OR realtime.topic() NOT LIKE 'dm:%'
);
