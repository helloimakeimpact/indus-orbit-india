
-- ============================================================
-- SLICE C: Spotlights CRUD, editor moderation, event RSVPs
-- ============================================================

-- ---------- 1. SPOTLIGHTS: extra columns + CRUD policies ----------
ALTER TABLE public.spotlights
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS spotlights_active_order_idx
  ON public.spotlights (is_active, display_order DESC, created_at DESC);

DROP TRIGGER IF EXISTS trg_spotlights_updated_at ON public.spotlights;
CREATE TRIGGER trg_spotlights_updated_at
  BEFORE UPDATE ON public.spotlights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Replace permissive view policy with one filtered to active
DROP POLICY IF EXISTS "Anyone can view spotlights" ON public.spotlights;
CREATE POLICY "Anyone can view active spotlights"
  ON public.spotlights FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all spotlights"
  ON public.spotlights FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update spotlights" ON public.spotlights;
CREATE POLICY "Admins can update spotlights"
  ON public.spotlights FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete spotlights" ON public.spotlights;
CREATE POLICY "Admins can delete spotlights"
  ON public.spotlights FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- 2. EDITOR moderation visibility on events ----------
-- Stories already have an editor view/update policy; add for events.
DROP POLICY IF EXISTS "Editors view all events" ON public.events;
CREATE POLICY "Editors view all events"
  ON public.events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Editors update events" ON public.events;
CREATE POLICY "Editors update events"
  ON public.events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'editor'));

-- Feature story helper (admin or editor only)
CREATE OR REPLACE FUNCTION public.lead_feature_story(_story_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor')) THEN
    RAISE EXCEPTION 'Only admins or editors can feature stories';
  END IF;
  UPDATE public.stories
  SET status = 'featured', published_at = COALESCE(published_at, now())
  WHERE id = _story_id;
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id)
  VALUES (auth.uid(), 'story.featured', 'story', _story_id);
END; $$;

-- ---------- 3. EVENT RSVPs ----------
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'going',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_rsvps_status_chk CHECK (status IN ('going','interested','not_going')),
  CONSTRAINT event_rsvps_unique UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON public.event_rsvps (event_id, status);
CREATE INDEX IF NOT EXISTS event_rsvps_user_idx ON public.event_rsvps (user_id);

DROP TRIGGER IF EXISTS trg_event_rsvps_updated_at ON public.event_rsvps;
CREATE TRIGGER trg_event_rsvps_updated_at
  BEFORE UPDATE ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Members manage their own RSVP
CREATE POLICY "Members insert own RSVP"
  ON public.event_rsvps FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_suspended(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_rsvps.event_id AND e.status = 'approved'
    )
  );

CREATE POLICY "Members update own RSVP"
  ON public.event_rsvps FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members delete own RSVP"
  ON public.event_rsvps FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Read access: own RSVP, organizer, chapter lead of the event's chapter, or admin
CREATE POLICY "Read own RSVP or as organizer/lead/admin"
  ON public.event_rsvps FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_rsvps.event_id
        AND (
          e.organizer_id = auth.uid()
          OR (e.chapter_id IS NOT NULL AND public.is_chapter_lead(auth.uid(), e.chapter_id))
        )
    )
  );

-- Helper for public counts (everyone can see aggregate)
CREATE OR REPLACE FUNCTION public.event_rsvp_counts(_event_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'going', count(*) FILTER (WHERE status = 'going'),
    'interested', count(*) FILTER (WHERE status = 'interested'),
    'not_going', count(*) FILTER (WHERE status = 'not_going')
  )
  FROM public.event_rsvps
  WHERE event_id = _event_id;
$$;
