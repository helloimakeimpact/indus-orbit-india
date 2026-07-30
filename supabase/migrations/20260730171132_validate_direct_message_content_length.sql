-- The preceding hardening migration added this as NOT VALID so existing demo
-- history could be checked first. The preflight count was zero violations.
ALTER TABLE public.direct_messages
  VALIDATE CONSTRAINT direct_messages_content_length_check;
