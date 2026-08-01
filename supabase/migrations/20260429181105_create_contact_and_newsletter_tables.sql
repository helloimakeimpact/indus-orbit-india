
-- Contact form submissions
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'Youth',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Newsletter subscriptions
CREATE TABLE public.newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public forms)
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  TO anon WITH CHECK (true);

CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscriptions FOR INSERT
  TO anon WITH CHECK (true);

-- Only authenticated admins can read (we check admin role in the app)
CREATE POLICY "Authenticated users can read contact submissions"
  ON public.contact_submissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read newsletter subscriptions"
  ON public.newsletter_subscriptions FOR SELECT
  TO authenticated USING (true);

