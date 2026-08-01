import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type SodaIdeaRow = Database["public"]["Tables"]["soda_ideas"]["Row"];
type SodaIdeaInsert = Database["public"]["Tables"]["soda_ideas"]["Insert"];
type SodaIdeaUpdate = Database["public"]["Tables"]["soda_ideas"]["Update"];
type JsonRecord = Record<string, Json | undefined>;

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
  business_fit: JsonRecord;
  type_label: string | null;
  market_label: string | null;
  target_label: string | null;
  main_competitor: string | null;
  trend_analysis: string | null;
  community_signals: Array<{ source: string; detail: string }>;
  top_keywords: Array<{ keyword: string; volume?: number; competition?: string }>;
  framework_fit: JsonRecord;
  tags: string[];
  badges: string[];
  hero_image_url: string | null;
  status: "draft" | "published";
  featured_on: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type SodaIdeaInput = Partial<SodaIdea> & { id?: string };

function asArray<T>(value: Json): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: Json): JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function toSodaStatus(status: string): SodaIdea["status"] {
  if (status === "draft" || status === "published") return status;
  throw new Error(`Unsupported S.O.D.A. idea status: ${status}`);
}

function toSodaIdea(row: SodaIdeaRow): SodaIdea {
  return {
    ...row,
    status: toSodaStatus(row.status),
    offer: asArray<SodaIdea["offer"][number]>(row.offer),
    business_fit: asRecord(row.business_fit),
    community_signals: asArray<SodaIdea["community_signals"][number]>(row.community_signals),
    top_keywords: asArray<SodaIdea["top_keywords"][number]>(row.top_keywords),
    framework_fit: asRecord(row.framework_fit),
    score_opportunity: row.score_opportunity ?? 0,
    score_problem: row.score_problem ?? 0,
    score_feasibility: row.score_feasibility ?? 0,
    score_why_now: row.score_why_now ?? 0,
  };
}

function getSodaIdeaPayload(input: SodaIdeaInput): SodaIdeaUpdate {
  const {
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    score_opportunity: _scoreOpportunity,
    score_problem: _scoreProblem,
    score_feasibility: _scoreFeasibility,
    score_why_now: _scoreWhyNow,
    ...payload
  } = input;

  return {
    ...payload,
    ...(input.score_opportunity === undefined
      ? {}
      : { score_opportunity: input.score_opportunity }),
    ...(input.score_problem === undefined ? {} : { score_problem: input.score_problem }),
    ...(input.score_feasibility === undefined
      ? {}
      : { score_feasibility: input.score_feasibility }),
    ...(input.score_why_now === undefined ? {} : { score_why_now: input.score_why_now }),
  };
}

export async function listPublishedSodaIdeas() {
  const { data, error } = await supabase
    .from("soda_ideas")
    .select("*")
    .eq("status", "published")
    .order("featured_on", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toSodaIdea);
}

export async function listAllSodaIdeasForAdmin() {
  const { data, error } = await supabase
    .from("soda_ideas")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toSodaIdea);
}

export async function getSodaIdeaBySlug(slug: string) {
  const { data, error } = await supabase
    .from("soda_ideas")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSodaIdea(data) : null;
}

export async function getIdeaOfTheDay() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("soda_ideas")
    .select("*")
    .eq("status", "published")
    .lte("featured_on", today)
    .order("featured_on", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return toSodaIdea(data);

  const { data: fallback, error: fallbackError } = await supabase
    .from("soda_ideas")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fallbackError) throw new Error(fallbackError.message);
  return fallback ? toSodaIdea(fallback) : null;
}

export async function upsertSodaIdea(input: SodaIdeaInput) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const payload = getSodaIdeaPayload(input);
  if (payload.status === "published" && !payload.published_at) {
    payload.published_at = new Date().toISOString();
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("soda_ideas")
      .update(payload)
      .eq("id", input.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toSodaIdea(data);
  }

  const slug = input.slug?.trim();
  const title = input.title?.trim();
  if (!slug || !title) throw new Error("Title and slug are required.");

  const insertPayload: SodaIdeaInsert = {
    ...payload,
    slug,
    title,
    created_by: userData.user.id,
  };
  const { data, error } = await supabase.from("soda_ideas").insert(insertPayload).select().single();
  if (error) throw new Error(error.message);
  return toSodaIdea(data);
}

export async function deleteSodaIdea(id: string) {
  const { error } = await supabase.from("soda_ideas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
