-- Allow 'open_problem' in the asks_offers kind column
ALTER TABLE public.asks_offers DROP CONSTRAINT IF EXISTS asks_offers_kind_check;
ALTER TABLE public.asks_offers ADD CONSTRAINT asks_offers_kind_check CHECK (kind = ANY (ARRAY['ask'::text, 'offer'::text, 'open_problem'::text]));

