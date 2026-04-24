-- =========================================================
-- PHASE 1: ADMIN GOVERNANCE
-- =========================================================

-- Suspensions
CREATE TABLE public.member_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  reason text NOT NULL,
  suspended_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz,
  lifted_by uuid
);
CREATE INDEX idx_suspensions_user_active ON public.member_suspensions(user_id) WHERE lifted_at IS NULL;
ALTER TABLE public.member_suspensions ENABLE ROW LEVEL SECURITY;

-- Helper: is the user currently suspended?
CREATE OR REPLACE FUNCTION public.is_suspended(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_suspensions
    WHERE user_id = _user_id AND lifted_at IS NULL
  )
$$;

CREATE POLICY "Admins manage suspensions select"
  ON public.member_suspensions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can read own suspension"
  ON public.member_suspensions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins insert suspensions"
  ON public.member_suspensions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());
CREATE POLICY "Admins update suspensions"
  ON public.member_suspensions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Audit log (insert-only)
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_actor ON public.audit_log(actor_id);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert audit log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());

-- Verification decisions
CREATE TABLE public.verification_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','declined','needs_more_info')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_verif_profile ON public.verification_decisions(profile_id, created_at DESC);
ALTER TABLE public.verification_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read verification decisions"
  ON public.verification_decisions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert verification decisions"
  ON public.verification_decisions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());

-- Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('profile','ask_offer','connection_request','endorsement')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','actioned','dismissed')),
  resolution_note text,
  resolver_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_reports_status ON public.reports(status, created_at DESC);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);
CREATE POLICY "Members create reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND NOT public.is_suspended(auth.uid()));
CREATE POLICY "Admins update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-stamp resolved_at on reports
CREATE OR REPLACE FUNCTION public.stamp_report_resolved()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('actioned','dismissed') AND OLD.status = 'open' THEN
    NEW.resolved_at := now();
    NEW.resolver_id := COALESCE(NEW.resolver_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_reports_stamp_resolved
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.stamp_report_resolved();

-- =========================================================
-- PHASE 2: CONNECTION PRIMITIVES
-- =========================================================

-- Connection requests
CREATE TABLE public.connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('intro','advice','collab','capital','other')),
  note text NOT NULL CHECK (char_length(note) <= 280),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CHECK (sender_id <> recipient_id)
);
CREATE UNIQUE INDEX uniq_pending_pair
  ON public.connection_requests(sender_id, recipient_id)
  WHERE status = 'pending';
CREATE INDEX idx_conn_recipient ON public.connection_requests(recipient_id, status);
CREATE INDEX idx_conn_sender ON public.connection_requests(sender_id, status);
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admins read requests"
  ON public.connection_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = sender_id
    OR auth.uid() = recipient_id
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Members send requests"
  ON public.connection_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT public.is_suspended(auth.uid())
    AND NOT public.is_suspended(recipient_id)
  );
CREATE POLICY "Sender or recipient update requests"
  ON public.connection_requests FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Auto-stamp responded_at when status leaves 'pending'
CREATE OR REPLACE FUNCTION public.stamp_request_responded()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'pending' AND OLD.status = 'pending' THEN
    NEW.responded_at := now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_conn_stamp_responded
  BEFORE UPDATE ON public.connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.stamp_request_responded();

-- Endorsements
CREATE TABLE public.endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id uuid NOT NULL,
  endorsee_id uuid NOT NULL,
  segment public.orbit_segment NOT NULL,
  note text CHECK (note IS NULL OR char_length(note) <= 140),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (endorser_id <> endorsee_id),
  UNIQUE (endorser_id, endorsee_id, segment)
);
CREATE INDEX idx_endorsements_endorsee ON public.endorsements(endorsee_id);
ALTER TABLE public.endorsements ENABLE ROW LEVEL SECURITY;

-- Public can read endorsements for publicly visible profiles
CREATE POLICY "Public read endorsements for public profiles"
  ON public.endorsements FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = endorsements.endorsee_id AND p.is_public = true
    )
  );
CREATE POLICY "Authenticated read all endorsements"
  ON public.endorsements FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Verified members can endorse"
  ON public.endorsements FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = endorser_id
    AND NOT public.is_suspended(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.is_verified = true
    )
  );
CREATE POLICY "Endorser can delete own endorsement"
  ON public.endorsements FOR DELETE TO authenticated
  USING (auth.uid() = endorser_id);

-- Asks & Offers board
CREATE TABLE public.asks_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ask','offer')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 500),
  segment_target public.orbit_segment[] NOT NULL DEFAULT '{}',
  region text,
  sector text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_asks_active ON public.asks_offers(created_at DESC) WHERE status = 'active';
CREATE INDEX idx_asks_author ON public.asks_offers(author_id);
ALTER TABLE public.asks_offers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_asks_offers_updated
  BEFORE UPDATE ON public.asks_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public read active asks/offers"
  ON public.asks_offers FOR SELECT TO public
  USING (status = 'active' AND expires_at > now());
CREATE POLICY "Authenticated read all asks/offers"
  ON public.asks_offers FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Members create asks/offers"
  ON public.asks_offers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT public.is_suspended(auth.uid()));
CREATE POLICY "Authors update own asks/offers"
  ON public.asks_offers FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);
CREATE POLICY "Admins update any ask/offer"
  ON public.asks_offers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors delete own asks/offers"
  ON public.asks_offers FOR DELETE TO authenticated
  USING (auth.uid() = author_id);
CREATE POLICY "Admins delete any ask/offer"
  ON public.asks_offers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));