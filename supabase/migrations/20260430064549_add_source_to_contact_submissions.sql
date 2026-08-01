ALTER TABLE public.contact_submissions ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'contact_page';

