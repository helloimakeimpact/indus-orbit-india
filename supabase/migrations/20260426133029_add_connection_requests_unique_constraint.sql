-- Prevent duplicate connection requests between the same sender and recipient
-- First, remove any existing duplicates (keep the earliest one)
DELETE FROM public.connection_requests a
USING public.connection_requests b
WHERE a.id > b.id
  AND a.sender_id = b.sender_id
  AND a.recipient_id = b.recipient_id;

-- Now add the unique constraint
ALTER TABLE public.connection_requests
ADD CONSTRAINT connection_requests_sender_recipient_key UNIQUE (sender_id, recipient_id);

