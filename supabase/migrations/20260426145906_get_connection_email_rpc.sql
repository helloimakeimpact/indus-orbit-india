CREATE OR REPLACE FUNCTION get_connection_email(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  connection_status TEXT;
  user_email TEXT;
BEGIN
  -- Check if there's an accepted connection request
  SELECT status INTO connection_status
  FROM connection_requests
  WHERE (sender_id = auth.uid() AND recipient_id = target_user_id)
     OR (recipient_id = auth.uid() AND sender_id = target_user_id)
  LIMIT 1;

  IF connection_status = 'accepted' THEN
    SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
    RETURN user_email;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

