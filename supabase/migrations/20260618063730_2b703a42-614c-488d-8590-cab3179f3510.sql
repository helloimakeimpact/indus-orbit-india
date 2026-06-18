
CREATE TABLE public.soda_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  tagline TEXT,
  sector TEXT NOT NULL DEFAULT 'general',
  summary TEXT,
  why_now TEXT,
  market_gap TEXT,
  execution_plan TEXT,
  offer JSONB NOT NULL DEFAULT '[]'::jsonb,
  keyword TEXT,
  volume INTEGER,
  growth_pct INTEGER,
  score_opportunity SMALLINT DEFAULT 0,
  score_problem SMALLINT DEFAULT 0,
  score_feasibility SMALLINT DEFAULT 0,
  score_why_now SMALLINT DEFAULT 0,
  business_fit JSONB NOT NULL DEFAULT '{}'::jsonb,
  type_label TEXT,
  market_label TEXT,
  target_label TEXT,
  main_competitor TEXT,
  trend_analysis TEXT,
  community_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  framework_fit JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  badges TEXT[] NOT NULL DEFAULT '{}',
  hero_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  featured_on DATE,
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.soda_ideas TO authenticated;
GRANT ALL ON public.soda_ideas TO service_role;

ALTER TABLE public.soda_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view published soda ideas"
  ON public.soda_ideas FOR SELECT
  TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert soda ideas"
  ON public.soda_ideas FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update soda ideas"
  ON public.soda_ideas FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete soda ideas"
  ON public.soda_ideas FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER soda_ideas_set_updated_at
  BEFORE UPDATE ON public.soda_ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX soda_ideas_status_idx ON public.soda_ideas (status, featured_on DESC);
CREATE INDEX soda_ideas_sector_idx ON public.soda_ideas (sector);
