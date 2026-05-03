
-- =========================================================
-- SLICE A — Distributed governance fixes
-- =========================================================

DROP POLICY IF EXISTS "Leads can insert chapter members" ON public.chapter_members;
CREATE POLICY "Leads can insert chapter members"
ON public.chapter_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chapter_members cm
    WHERE cm.chapter_id = chapter_members.chapter_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'lead'
  )
);

DROP POLICY IF EXISTS "Leads can insert mission members" ON public.mission_members;
CREATE POLICY "Leads can insert mission members"
ON public.mission_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mission_members mm
    WHERE mm.mission_id = mission_members.mission_id
      AND mm.user_id = auth.uid()
      AND mm.role = 'lead'
  )
);

CREATE OR REPLACE FUNCTION public.is_chapter_lead(_user_id uuid, _chapter_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chapter_members
    WHERE user_id = _user_id AND chapter_id = _chapter_id AND role = 'lead'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_mission_lead(_user_id uuid, _mission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mission_members
    WHERE user_id = _user_id AND mission_id = _mission_id AND role = 'lead'
  );
$$;

CREATE OR REPLACE FUNCTION public.lead_approve_story(_story_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _chapter uuid;
BEGIN
  SELECT chapter_id INTO _chapter FROM public.stories WHERE id = _story_id;
  IF _chapter IS NULL THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can approve global stories';
    END IF;
  ELSE
    IF NOT (public.has_role(auth.uid(), 'admin') OR public.is_chapter_lead(auth.uid(), _chapter)) THEN
      RAISE EXCEPTION 'Only chapter leads can approve this story';
    END IF;
  END IF;
  UPDATE public.stories SET status = 'approved', published_at = COALESCE(published_at, now()) WHERE id = _story_id;
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id)
  VALUES (auth.uid(), 'story.approved', 'story', _story_id);
END; $$;

CREATE OR REPLACE FUNCTION public.lead_reject_story(_story_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _chapter uuid;
BEGIN
  SELECT chapter_id INTO _chapter FROM public.stories WHERE id = _story_id;
  IF NOT (public.has_role(auth.uid(), 'admin')
          OR (_chapter IS NOT NULL AND public.is_chapter_lead(auth.uid(), _chapter))) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.stories SET status = 'rejected' WHERE id = _story_id;
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, reason)
  VALUES (auth.uid(), 'story.rejected', 'story', _story_id, _reason);
END; $$;

CREATE OR REPLACE FUNCTION public.lead_approve_event(_event_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _chapter uuid;
BEGIN
  SELECT chapter_id INTO _chapter FROM public.events WHERE id = _event_id;
  IF NOT (public.has_role(auth.uid(), 'admin')
          OR (_chapter IS NOT NULL AND public.is_chapter_lead(auth.uid(), _chapter))) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.events SET status = 'approved' WHERE id = _event_id;
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id)
  VALUES (auth.uid(), 'event.approved', 'event', _event_id);
END; $$;

CREATE OR REPLACE FUNCTION public.lead_reject_event(_event_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _chapter uuid;
BEGIN
  SELECT chapter_id INTO _chapter FROM public.events WHERE id = _event_id;
  IF NOT (public.has_role(auth.uid(), 'admin')
          OR (_chapter IS NOT NULL AND public.is_chapter_lead(auth.uid(), _chapter))) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.events SET status = 'rejected' WHERE id = _event_id;
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, reason)
  VALUES (auth.uid(), 'event.rejected', 'event', _event_id, _reason);
END; $$;

DROP POLICY IF EXISTS "Leads view pending chapter stories" ON public.stories;
CREATE POLICY "Leads view pending chapter stories"
ON public.stories FOR SELECT TO authenticated
USING (chapter_id IS NOT NULL AND public.is_chapter_lead(auth.uid(), chapter_id));

DROP POLICY IF EXISTS "Leads view pending chapter events" ON public.events;
CREATE POLICY "Leads view pending chapter events"
ON public.events FOR SELECT TO authenticated
USING (chapter_id IS NOT NULL AND public.is_chapter_lead(auth.uid(), chapter_id));

CREATE OR REPLACE FUNCTION public.my_lead_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'chapter_lead_count', (SELECT count(*) FROM public.chapter_members WHERE user_id = auth.uid() AND role = 'lead'),
    'mission_lead_count', (SELECT count(*) FROM public.mission_members WHERE user_id = auth.uid() AND role = 'lead')
  );
$$;

-- =========================================================
-- SLICE B — Vouching fixes
-- =========================================================

DROP POLICY IF EXISTS "Anyone can look up code by exact value" ON public.vouch_codes;

CREATE OR REPLACE FUNCTION public.lookup_vouch_code(_code text)
RETURNS TABLE (id uuid, status text, expires_at timestamptz, issuer_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, status, expires_at, issuer_id
  FROM public.vouch_codes
  WHERE code = upper(trim(_code))
  LIMIT 1;
$$;

-- Replace partial indexes with one trigger-maintained key column for clean upsert.
DROP INDEX IF EXISTS public.vouch_role_overrides_role_segment_uniq;
DROP INDEX IF EXISTS public.vouch_role_overrides_role_any_uniq;

ALTER TABLE public.vouch_role_overrides
  ADD COLUMN IF NOT EXISTS segment_key text;

CREATE OR REPLACE FUNCTION public.vouch_role_overrides_set_key()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.segment_key := COALESCE(NEW.segment::text, '__any__');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_vouch_role_overrides_set_key ON public.vouch_role_overrides;
CREATE TRIGGER trg_vouch_role_overrides_set_key
BEFORE INSERT OR UPDATE ON public.vouch_role_overrides
FOR EACH ROW EXECUTE FUNCTION public.vouch_role_overrides_set_key();

UPDATE public.vouch_role_overrides
SET segment_key = COALESCE(segment::text, '__any__')
WHERE segment_key IS NULL;

ALTER TABLE public.vouch_role_overrides
  ALTER COLUMN segment_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS vouch_role_overrides_role_segkey_uniq
  ON public.vouch_role_overrides (role, segment_key);

CREATE OR REPLACE FUNCTION public.notify_admins_on_open_vouch_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.target_verifier_id IS NULL THEN
    INSERT INTO public.notifications (user_id, type, message, link)
    SELECT ur.user_id, 'vouch_request_admin',
           'A member is asking for verification.',
           '/app/admin/vouches'
    FROM public.user_roles ur
    WHERE ur.role = 'admin';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_open_vouch_request ON public.vouch_requests;
CREATE TRIGGER trg_notify_admins_on_open_vouch_request
AFTER INSERT ON public.vouch_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_open_vouch_request();

CREATE OR REPLACE FUNCTION public.admin_resolve_vouch_request(_request_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _req record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO _req FROM public.vouch_requests WHERE id = _request_id FOR UPDATE;
  IF _req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _req.status <> 'open' THEN RAISE EXCEPTION 'Already resolved'; END IF;

  UPDATE public.vouch_requests
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      responded_at = now()
  WHERE id = _request_id;

  IF _approve THEN
    UPDATE public.profiles
    SET is_verified = true, verified_by = auth.uid(), verified_at = now()
    WHERE user_id = _req.requester_id AND COALESCE(is_verified,false) = false;

    INSERT INTO public.vouch_events (issuer_id, recipient_id, channel)
    VALUES (auth.uid(), _req.requester_id, 'admin');

    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (_req.requester_id, 'vouch_request_approved',
            'Your verification request was approved.', '/app/profile');
  ELSE
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (_req.requester_id, 'vouch_request_rejected',
            'Your verification request was not approved.', '/app/profile');
  END IF;

  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, reason)
  VALUES (auth.uid(),
          CASE WHEN _approve THEN 'vouch.request_approved' ELSE 'vouch.request_rejected' END,
          'vouch_request', _request_id, _reason);
END; $$;
