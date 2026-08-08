-- Move direct-message writes behind caller-bound, event-specific contracts.
-- The browser keeps RLS-scoped read access, but can no longer choose sender
-- identity, write arbitrary notifications, or mutate message rows directly.

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS direct_messages_sender_client_request_key
  ON public.direct_messages (sender_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS direct_messages_conversation_recent_idx
  ON public.direct_messages (sender_id, recipient_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS direct_messages_recipient_unread_idx
  ON public.direct_messages (recipient_id, created_at DESC, id DESC)
  WHERE read_at IS NULL;

CREATE OR REPLACE FUNCTION public.send_my_direct_message(
  _recipient_id uuid,
  _content text,
  _client_request_id uuid
)
RETURNS public.direct_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _actor_id uuid := auth.uid();
  _message_content text := pg_catalog.btrim(_content);
  _existing public.direct_messages%ROWTYPE;
  _created public.direct_messages%ROWTYPE;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  IF _recipient_id IS NULL OR _client_request_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22004',
      MESSAGE = 'Recipient and client request ID are required';
  END IF;

  IF _recipient_id = _actor_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'You cannot message yourself';
  END IF;

  IF _message_content IS NULL OR pg_catalog.char_length(_message_content) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Message cannot be empty';
  END IF;

  IF pg_catalog.char_length(_message_content) > 4000 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Message cannot exceed 4,000 characters';
  END IF;

  -- Serialise a sender's writes so the fixed per-minute limit remains
  -- deterministic under concurrent requests. The lock key contains no content.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('direct-message:' || _actor_id::text, 0)
  );

  SELECT message.*
  INTO _existing
  FROM public.direct_messages AS message
  WHERE message.sender_id = _actor_id
    AND message.client_request_id = _client_request_id;

  IF FOUND THEN
    IF _existing.recipient_id <> _recipient_id
      OR _existing.content <> _message_content THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Client request ID was already used for another message';
    END IF;

    RETURN _existing;
  END IF;

  IF public.is_suspended(_actor_id) OR public.is_suspended(_recipient_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Messaging is unavailable for this member';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.connection_requests AS connection
    WHERE connection.status = 'accepted'
      AND (
        (connection.sender_id = _actor_id AND connection.recipient_id = _recipient_id)
        OR
        (connection.sender_id = _recipient_id AND connection.recipient_id = _actor_id)
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'You can only message connected members';
  END IF;

  IF (
    SELECT pg_catalog.count(*)
    FROM public.direct_messages AS recent
    WHERE recent.sender_id = _actor_id
      AND recent.created_at >= pg_catalog.statement_timestamp() - interval '1 minute'
  ) >= 30 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Message rate limit reached; please wait a minute';
  END IF;

  INSERT INTO public.direct_messages (
    sender_id,
    recipient_id,
    content,
    client_request_id
  )
  VALUES (
    _actor_id,
    _recipient_id,
    _message_content,
    _client_request_id
  )
  RETURNING * INTO _created;

  -- This event-specific notification has a server-owned recipient, category,
  -- message and path. Message content is deliberately never copied here.
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (
    _recipient_id,
    'direct_message',
    'You have a new message.',
    '/app/messages?user=' || _actor_id::text
  );

  RETURN _created;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_my_direct_conversation_read(
  _other_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _actor_id uuid := auth.uid();
  _updated_count integer;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  IF _other_user_id IS NULL OR _other_user_id = _actor_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Another member is required';
  END IF;

  IF public.is_suspended(_actor_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Messaging is unavailable for this member';
  END IF;

  UPDATE public.direct_messages AS message
  SET read_at = pg_catalog.statement_timestamp()
  WHERE message.recipient_id = _actor_id
    AND message.sender_id = _other_user_id
    AND message.read_at IS NULL;

  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  RETURN _updated_count;
END;
$$;

REVOKE ALL PRIVILEGES ON FUNCTION public.send_my_direct_message(uuid, text, uuid)
  FROM PUBLIC, anon;
REVOKE ALL PRIVILEGES ON FUNCTION public.mark_my_direct_conversation_read(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.send_my_direct_message(uuid, text, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_direct_conversation_read(uuid)
  TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.direct_messages FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.direct_messages FROM authenticated;
GRANT SELECT ON TABLE public.direct_messages TO authenticated;

DROP POLICY IF EXISTS "Users can view own messages"
  ON public.direct_messages;
CREATE POLICY "Members view own direct messages"
ON public.direct_messages
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) = sender_id
  OR (SELECT auth.uid()) = recipient_id
);

DROP POLICY IF EXISTS "Connected active members can send messages"
  ON public.direct_messages;
DROP POLICY IF EXISTS "Active recipients mark messages read"
  ON public.direct_messages;

COMMENT ON FUNCTION public.send_my_direct_message(uuid, text, uuid) IS
  'Caller-bound, idempotent direct-message send. Enforces accepted connection, suspension and rate limits, then creates a fixed content-free notification atomically.';

COMMENT ON FUNCTION public.mark_my_direct_conversation_read(uuid) IS
  'Marks only the authenticated recipient direct messages from one specified sender as read.';

COMMENT ON COLUMN public.direct_messages.client_request_id IS
  'Caller-generated idempotency key scoped to the authenticated sender.';
