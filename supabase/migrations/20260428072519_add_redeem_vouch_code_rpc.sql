
-- This SECURITY DEFINER function runs as the DB owner, bypassing RLS and triggers
-- that block normal users from setting is_verified.
-- It performs all the same safety checks the client-side code does.
CREATE OR REPLACE FUNCTION public.redeem_vouch_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _code_row record;
  _profile record;
  _susp record;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Normalize code
  _code := upper(trim(_code));
  IF length(_code) < 6 THEN
    RAISE EXCEPTION 'Invalid code.';
  END IF;

  -- Lookup the code
  SELECT * INTO _code_row
  FROM vouch_codes
  WHERE code = _code;

  IF _code_row IS NULL THEN
    RAISE EXCEPTION 'Code not found.';
  END IF;

  IF _code_row.status != 'active' THEN
    RAISE EXCEPTION 'Code is %.', _code_row.status;
  END IF;

  IF _code_row.expires_at < now() THEN
    UPDATE vouch_codes SET status = 'expired' WHERE id = _code_row.id;
    RAISE EXCEPTION 'Code has expired.';
  END IF;

  IF _code_row.issuer_id = _user_id THEN
    RAISE EXCEPTION 'You cannot redeem your own code.';
  END IF;

  -- Check suspension
  SELECT id INTO _susp
  FROM member_suspensions
  WHERE user_id = _user_id AND lifted_at IS NULL;

  IF _susp.id IS NOT NULL THEN
    RAISE EXCEPTION 'Your account is suspended.';
  END IF;

  -- Get the redeemer's profile
  SELECT id, is_verified INTO _profile
  FROM profiles
  WHERE user_id = _user_id;

  IF _profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found. Complete onboarding first.';
  END IF;

  -- Verify the user if not already verified
  -- This runs as SECURITY DEFINER so it bypasses the guard trigger
  IF NOT COALESCE(_profile.is_verified, false) THEN
    UPDATE profiles
    SET is_verified = true,
        verified_by = _code_row.issuer_id,
        verified_at = now()
    WHERE id = _profile.id;
  END IF;

  -- Mark code as redeemed
  UPDATE vouch_codes
  SET status = 'redeemed',
      redeemed_at = now(),
      redeemer_id = _user_id
  WHERE id = _code_row.id;

  -- Update vouch event
  UPDATE vouch_events
  SET recipient_id = _user_id
  WHERE code_id = _code_row.id;

  -- Audit log
  INSERT INTO audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (_user_id, 'vouch.code_redeemed', 'vouch_code', _code_row.id::text,
          jsonb_build_object('issuer_id', _code_row.issuer_id));

  -- Notify the issuer
  INSERT INTO notifications (user_id, type, message, link)
  VALUES (_code_row.issuer_id, 'vouch_code_redeemed',
          'Someone successfully redeemed your vouch code.', '/app/vouch');

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.redeem_vouch_code(text) TO authenticated;

