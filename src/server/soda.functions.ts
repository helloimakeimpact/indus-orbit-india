import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type SodaIdea = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  sector: string;
  summary: string | null;
  why_now: string | null;
  market_gap: string | null;
  execution_plan: string | null;
  offer: Array<{ tier: string; name: string; price?: string; description?: string }>;
  keyword: string | null;
  volume: number | null;
  growth_pct: number | null;
  score_opportunity: number;
  score_problem: number;
  score_feasibility: number;
  score_why_now: number;
  business_fit: Record<string, any>;
  type_label: string | null;
  market_label: string | null;
  target_label: string | null;
  main_competitor: string | null;
  trend_analysis: string | null;
  community_signals: Array<{ source: string; detail: string }>;
  top_keywords: Array<{ keyword: string; volume?: number; competition?: string }>;
  framework_fit: Record<string, any>;
  tags: string[];
  badges: string[];
  hero_image_url: string | null;
  status: "draft" | "published";
  featured_on: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listPublishedSodaIdeas() {
  const { data, error } = await sb
    .from("soda_ideas")
    .select("*")
    .eq("status", "published")
    .order("featured_on", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SodaIdea[];
}

export async function listAllSodaIdeasForAdmin() {
  const { data, error } = await sb
    .from("soda_ideas")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SodaIdea[];
}

export async function getSodaIdeaBySlug(slug: string) {
  const { data, error } = await sb.from("soda_ideas").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as SodaIdea | null;
}

export async function getIdeaOfTheDay() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("soda_ideas")
    .select("*")
    .eq("status", "published")
    .lte("featured_on", today)
    .order("featured_on", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as SodaIdea;
  // fallback to most recent
  const { data: fallback, error: fallbackError } = await sb
    .from("soda_ideas")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fallbackError) throw new Error(fallbackError.message);
  return (fallback ?? null) as SodaIdea | null;
}

export async function upsertSodaIdea(input: Partial<SodaIdea> & { id?: string }) {
  const { data: userData } = await supabase.auth.getUser();
  const payload: any = { ...input };
  if (payload.status === "published" && !payload.published_at) {
    payload.published_at = new Date().toISOString();
  }
  if (!payload.id) {
    payload.created_by = userData.user?.id;
  }
  delete payload.created_at;
  delete payload.updated_at;

  const { data, error } = await sb
    .from("soda_ideas")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SodaIdea;
}

export async function deleteSodaIdea(id: string) {
  const { error } = await sb.from("soda_ideas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
