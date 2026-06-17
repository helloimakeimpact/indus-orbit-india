ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS segment_details_text text
  GENERATED ALWAYS AS (segment_details::text) STORED;
