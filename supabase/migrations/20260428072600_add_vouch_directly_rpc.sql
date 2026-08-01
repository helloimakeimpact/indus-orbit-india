
-- SECURITY DEFINER function for direct vouch (verified user vouching for another)
CREATE OR REPLACE FUNCTION public.vouch_directly(_recipient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _recipient record;
  _already_verified boolean;
  _is_admin boolean;
  _is_verified boolean;
  _remaining integer;
  _susp record;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _recipient_id = _user_id THEN
    RAISE EXCEPTION 'You cannot vouch for yourself.';
  END IF;

  -- Check suspension
  SELECT id INTO _susp
  FROM member_suspensions
  WHERE user_id = _user_id AND lifted_at IS NULL;
  IF _susp.id IS NOT NULL THEN
    RAISE EXCEPTION 'Your account is suspended.';
  END IF;

  -- Check admin or verified
  SELECT has_role(_user_id, 'admin') INTO _is_admin;
  IF NOT _is_admin THEN
    SELECT p.is_verified INTO _is_verified
    FROM profiles p WHERE p.user_id = _user_id;
    IF NOT COALESCE(_is_verified, false) THEN
      RAISE EXCEPTION 'Only verified members can vouch.';
    END IF;

    SELECT vouch_remaining(_user_id) INTO _remaining;
    IF _remaining <= 0 THEN
      RAISE EXCEPTION 'You have used your vouch budget for this period.';
    END IF;
  END IF;

  -- Get recipient
  SELECT id, user_id, is_verified INTO _recipient
  FROM profiles
  WHERE user_id = _recipient_id;

  IF _recipient IS NULL THEN
    RAISE EXCEPTION 'Recipient not found.';
  END IF;

  _already_verified := COALESCE(_recipient.is_verified, false);

  -- Verify recipient if not already verified
  IF NOT _already_verified THEN
    UPDATE profiles
    SET is_verified = true,
        verified_by = _user_id,
        verified_at = now()
    WHERE id = _recipient.id;
  END IF;

  -- Record vouch event
  INSERT INTO vouch_events (issuer_id, recipient_id, channel)
  VALUES (_user_id, _recipient_id, 'direct');

  -- Audit
  INSERT INTO audit_log (actor_id, action, target_type, target_id)
  VALUES (_user_id, 'vouch.direct', 'profile', _recipient_id::text);

  -- Notify
  INSERT INTO notifications (user_id, type, message, link)
  VALUES (_recipient_id, 'vouch_direct', 'You have been vouched for and verified!', '/app/profile');

  RETURN jsonb_build_object('ok', true, 'alreadyVerified', _already_verified);
END;
$$;

GRANT EXECUTE ON FUNCTION public.vouch_directly(uuid) TO authenticated;

