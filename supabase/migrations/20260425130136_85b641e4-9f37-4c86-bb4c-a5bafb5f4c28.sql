
-- =========================================================
-- VOUCH SETTINGS (singleton)
-- =========================================================
CREATE TABLE public.vouch_settings (
  id text PRIMARY KEY DEFAULT 'global',
  default_quota integer NOT NULL DEFAULT 5,
  code_ttl_days integer NOT NULL DEFAULT 14,
  window_days integer NOT NULL DEFAULT 28,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT vouch_settings_singleton CHECK (id = 'global')
);

INSERT INTO public.vouch_settings (id) VALUES ('global');

ALTER TABLE public.vouch_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads settings"
  ON public.vouch_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins update settings"
  ON public.vouch_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- ROLE OVERRIDES
-- =========================================================
CREATE TABLE public.vouch_role_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  segment public.orbit_segment,         -- nullable: applies to all segments
  quota integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Two partial unique indexes (immutable expressions only)
CREATE UNIQUE INDEX vouch_role_overrides_role_segment_uniq
  ON public.vouch_role_overrides (role, segment)
  WHERE segment IS NOT NULL;
CREATE UNIQUE INDEX vouch_role_overrides_role_any_uniq
  ON public.vouch_role_overrides (role)
  WHERE segment IS NULL;

ALTER TABLE public.vouch_role_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads role overrides"
  ON public.vouch_role_overrides FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage role overrides"
  ON public.vouch_role_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- USER OVERRIDES
-- =========================================================
CREATE TABLE public.vouch_user_overrides (
  user_id uuid PRIMARY KEY,
  quota integer NOT NULL,
  reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.vouch_user_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own override"
  ON public.vouch_user_overrides FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage user overrides"
  ON public.vouch_user_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- VOUCH CODES
-- =========================================================
CREATE TABLE public.vouch_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  issuer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  redeemer_id uuid,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'redeemed', 'expired', 'revoked'))
);

CREATE INDEX vouch_codes_issuer_idx ON public.vouch_codes (issuer_id, created_at DESC);

ALTER TABLE public.vouch_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issuer reads own codes"
  ON public.vouch_codes FOR SELECT TO authenticated
  USING (auth.uid() = issuer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can look up code by exact value"
  ON public.vouch_codes FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins or issuer update codes"
  ON public.vouch_codes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = issuer_id);

-- =========================================================
-- VOUCH EVENTS (the ledger that powers the 28-day window)
-- =========================================================
CREATE TABLE public.vouch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL,
  recipient_id uuid,
  channel text NOT NULL CHECK (channel IN ('code', 'direct')),
  code_id uuid REFERENCES public.vouch_codes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vouch_events_issuer_window_idx
  ON public.vouch_events (issuer_id, created_at DESC);
CREATE INDEX vouch_events_recipient_idx
  ON public.vouch_events (recipient_id);

ALTER TABLE public.vouch_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admins read events"
  ON public.vouch_events FOR SELECT TO authenticated
  USING (
    auth.uid() = issuer_id
    OR auth.uid() = recipient_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- =========================================================
-- VOUCH REQUESTS
-- =========================================================
CREATE TABLE public.vouch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_verifier_id uuid,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'fulfilled', 'declined', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

CREATE INDEX vouch_requests_target_idx ON public.vouch_requests (target_verifier_id, status);
CREATE INDEX vouch_requests_requester_idx ON public.vouch_requests (requester_id);

ALTER TABLE public.vouch_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester creates own request"
  ON public.vouch_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND NOT public.is_suspended(auth.uid()));

CREATE POLICY "Requester or target or admin reads request"
  ON public.vouch_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = requester_id
    OR auth.uid() = target_verifier_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Target or admin updates request"
  ON public.vouch_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = target_verifier_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================
CREATE OR REPLACE FUNCTION public.vouch_effective_quota(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  per_user integer;
  per_role integer;
  global_q integer;
  user_segment public.orbit_segment;
  is_admin boolean;
BEGIN
  SELECT public.has_role(_user_id, 'admin') INTO is_admin;
  IF is_admin THEN
    RETURN 9999;
  END IF;

  SELECT quota INTO per_user FROM public.vouch_user_overrides WHERE user_id = _user_id;
  IF per_user IS NOT NULL THEN
    RETURN per_user;
  END IF;

  SELECT orbit_segment INTO user_segment FROM public.profiles WHERE user_id = _user_id;

  IF user_segment IS NOT NULL THEN
    SELECT quota INTO per_role
    FROM public.vouch_role_overrides
    WHERE role = 'member' AND segment = user_segment
    LIMIT 1;
    IF per_role IS NOT NULL THEN
      RETURN per_role;
    END IF;
  END IF;

  SELECT quota INTO per_role
  FROM public.vouch_role_overrides
  WHERE role = 'member' AND segment IS NULL
  LIMIT 1;
  IF per_role IS NOT NULL THEN
    RETURN per_role;
  END IF;

  SELECT default_quota INTO global_q FROM public.vouch_settings WHERE id = 'global';
  RETURN COALESCE(global_q, 5);
END;
$$;

CREATE OR REPLACE FUNCTION public.vouch_used_in_window(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  win_days integer;
  used integer;
BEGIN
  SELECT window_days INTO win_days FROM public.vouch_settings WHERE id = 'global';
  IF win_days IS NULL THEN win_days := 28; END IF;

  SELECT count(*) INTO used
  FROM public.vouch_events
  WHERE issuer_id = _user_id
    AND created_at > (now() - (win_days || ' days')::interval);

  RETURN COALESCE(used, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.vouch_remaining(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(public.vouch_effective_quota(_user_id) - public.vouch_used_in_window(_user_id), 0);
$$;

-- =========================================================
-- ALLOW SERVICE ROLE TO FLIP is_verified VIA VOUCH SERVER FN
-- =========================================================
CREATE OR REPLACE FUNCTION public.guard_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role text;
BEGIN
  SELECT current_setting('request.jwt.claim.role', true) INTO current_role;
  IF current_role = 'service_role' THEN
    IF NEW.is_verified = true AND (OLD.is_verified = false OR OLD.is_verified IS NULL) THEN
      NEW.verified_at := COALESCE(NEW.verified_at, now());
    ELSIF NEW.is_verified = false AND OLD.is_verified = true THEN
      NEW.verified_at := NULL;
      NEW.verified_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    IF NEW.is_verified = true AND (OLD.is_verified = false OR OLD.is_verified IS NULL) THEN
      NEW.verified_at := now();
      NEW.verified_by := auth.uid();
    ELSIF NEW.is_verified = false AND OLD.is_verified = true THEN
      NEW.verified_at := NULL;
      NEW.verified_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
    RAISE EXCEPTION 'Only admins can change verification status';
  END IF;

  RETURN NEW;
END;
$$;
