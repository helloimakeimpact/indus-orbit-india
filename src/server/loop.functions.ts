import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type LoopEntry = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  hero_image_url: string | null;
  status: "draft" | "published";
  featured_on: string | null;
  domain: string;
  tags: string[];
  badges: string[];
  problem_statement: string | null;
  why_iterate: string | null;
  minimum_loop: { input?: string; pipeline?: string; output?: string; eval?: string };
  eval_set_description: string | null;
  current_baseline_model: string | null;
  trigger_to_rerun: string | null;
  upgrade_history: Array<{ date: string; change: string; delta?: string }>;
  stack: string[];
  cost_per_iteration_inr: number | null;
  latency_target_ms: number | null;
  related_soda_slug: string | null;
  score_iteration_speed: number;
  score_eval_rigor: number;
  score_business_value: number;
  score_india_fit: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listPublishedLoops() {
  const { data, error } = await sb
    .from("loops")
    .select("*")
    .eq("status", "published")
    .order("featured_on", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LoopEntry[];
}

export async function listAllLoopsForAdmin() {
  const { data, error } = await sb.from("loops").select("*").order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LoopEntry[];
}

export async function getLoopBySlug(slug: string) {
  const { data, error } = await sb.from("loops").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as LoopEntry | null;
}

export async function upsertLoop(input: Partial<LoopEntry> & { id?: string }) {
  const { data: userData } = await supabase.auth.getUser();
  const payload: any = { ...input };
  if (payload.status === "published" && !payload.published_at) payload.published_at = new Date().toISOString();
  if (!payload.id) payload.created_by = userData.user?.id;
  delete payload.created_at;
  delete payload.updated_at;
  const { data, error } = await sb.from("loops").upsert(payload, { onConflict: "id" }).select().single();
  if (error) throw new Error(error.message);
  return data as LoopEntry;
}

export async function deleteLoop(id: string) {
  const { error } = await sb.from("loops").delete().eq("id", id);
  if (error) throw new Error(error.message);
}