-- Direct messages are a person-to-person surface. Enforce the accepted-connection
-- rule in RLS so it cannot be bypassed through the Data API.
ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_content_length_check
  CHECK (char_length(content) <= 4000) NOT VALID;

DROP POLICY IF EXISTS "Users can send messages" ON public.direct_messages;
CREATE POLICY "Connected active members can send messages"
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = sender_id
  AND sender_id <> recipient_id
  AND NOT public.is_suspended((SELECT auth.uid()))
  AND NOT public.is_suspended(recipient_id)
  AND EXISTS (
    SELECT 1
    FROM public.connection_requests AS connection
    WHERE connection.status = 'accepted'
      AND (
        (connection.sender_id = (SELECT auth.uid()) AND connection.recipient_id = direct_messages.recipient_id)
        OR (connection.recipient_id = (SELECT auth.uid()) AND connection.sender_id = direct_messages.recipient_id)
      )
  )
);

-- Row policies cannot limit columns. Revoke table-wide UPDATE and grant only the
-- read receipt column; message content and participants remain immutable.
REVOKE UPDATE ON TABLE public.direct_messages FROM anon, authenticated;
GRANT UPDATE (read_at) ON TABLE public.direct_messages TO authenticated;

DROP POLICY IF EXISTS "Recipients can mark read" ON public.direct_messages;
CREATE POLICY "Active recipients mark messages read"
ON public.direct_messages
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) = recipient_id
  AND NOT public.is_suspended((SELECT auth.uid()))
)
WITH CHECK (
  (SELECT auth.uid()) = recipient_id
  AND read_at IS NOT NULL
);
