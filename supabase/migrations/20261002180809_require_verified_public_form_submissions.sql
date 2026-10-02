-- The browser submits through public-form-submit after server-side hCaptcha
-- verification. Removing only the widget would never secure direct REST inserts.
BEGIN;
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscriptions;
REVOKE INSERT ON public.contact_submissions, public.newsletter_subscriptions FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.contact_submissions, public.newsletter_subscriptions TO service_role;
COMMIT;
