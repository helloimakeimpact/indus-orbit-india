-- SKILLS
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  hero_image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  featured_on date,
  category text NOT NULL DEFAULT 'ops',
  tags text[] NOT NULL DEFAULT '{}',
  badges text[] NOT NULL DEFAULT '{}',
  when_to_use text,
  prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  time_estimate text,
  cost_estimate text,
  common_pitfalls text,
  india_context_notes text,
  templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  referenced_tools text[] NOT NULL DEFAULT '{}',
  legal_refs text[] NOT NULL DEFAULT '{}',
  score_clarity int NOT NULL DEFAULT 7,
  score_completeness int NOT NULL DEFAULT 7,
  score_india_fit int NOT NULL DEFAULT 8,
  score_freshness int NOT NULL DEFAULT 8,
  created_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.skills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published skills"
  ON public.skills FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "Authenticated can view published skills"
  ON public.skills FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert skills"
  ON public.skills FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update skills"
  ON public.skills FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete skills"
  ON public.skills FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER skills_set_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LOOPS
CREATE TABLE public.loops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  hero_image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  featured_on date,
  domain text NOT NULL DEFAULT 'agents',
  tags text[] NOT NULL DEFAULT '{}',
  badges text[] NOT NULL DEFAULT '{}',
  problem_statement text,
  why_iterate text,
  minimum_loop jsonb NOT NULL DEFAULT '{}'::jsonb,
  eval_set_description text,
  current_baseline_model text,
  trigger_to_rerun text,
  upgrade_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  stack text[] NOT NULL DEFAULT '{}',
  cost_per_iteration_inr int,
  latency_target_ms int,
  related_soda_slug text,
  score_iteration_speed int NOT NULL DEFAULT 7,
  score_eval_rigor int NOT NULL DEFAULT 7,
  score_business_value int NOT NULL DEFAULT 8,
  score_india_fit int NOT NULL DEFAULT 8,
  created_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loops TO authenticated;
GRANT ALL ON public.loops TO service_role;

ALTER TABLE public.loops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published loops"
  ON public.loops FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "Authenticated can view published loops"
  ON public.loops FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert loops"
  ON public.loops FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update loops"
  ON public.loops FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete loops"
  ON public.loops FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER loops_set_updated_at
  BEFORE UPDATE ON public.loops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();