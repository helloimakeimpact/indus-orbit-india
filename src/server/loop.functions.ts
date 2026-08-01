import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type LoopRow = Database["public"]["Tables"]["loops"]["Row"];
type LoopInsert = Database["public"]["Tables"]["loops"]["Insert"];
type LoopUpdate = Database["public"]["Tables"]["loops"]["Update"];

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

type LoopInput = Partial<LoopEntry> & { id?: string };

function asArray<T>(value: Json): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asObject<T extends object>(value: Json): T {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as T)
    : ({} as T);
}

function toLoopStatus(status: string): LoopEntry["status"] {
  if (status === "draft" || status === "published") return status;
  throw new Error(`Unsupported loop status: ${status}`);
}

function toLoopEntry(row: LoopRow): LoopEntry {
  return {
    ...row,
    status: toLoopStatus(row.status),
    minimum_loop: asObject<LoopEntry["minimum_loop"]>(row.minimum_loop),
    upgrade_history: asArray<LoopEntry["upgrade_history"][number]>(row.upgrade_history),
  };
}

function getLoopPayload(input: LoopInput): LoopUpdate {
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...payload } = input;

  return payload;
}

export async function listPublishedLoops() {
  const { data, error } = await supabase
    .from("loops")
    .select("*")
    .eq("status", "published")
    .order("featured_on", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toLoopEntry);
}

export async function listAllLoopsForAdmin() {
  const { data, error } = await supabase
    .from("loops")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toLoopEntry);
}

export async function getLoopBySlug(slug: string) {
  const { data, error } = await supabase.from("loops").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toLoopEntry(data) : null;
}

export async function upsertLoop(input: LoopInput) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const payload = getLoopPayload(input);
  if (payload.status === "published" && !payload.published_at) {
    payload.published_at = new Date().toISOString();
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("loops")
      .update(payload)
      .eq("id", input.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toLoopEntry(data);
  }

  const slug = input.slug?.trim();
  const title = input.title?.trim();
  if (!slug || !title) throw new Error("Title and slug are required.");

  const insertPayload: LoopInsert = {
    ...payload,
    slug,
    title,
    created_by: userData.user.id,
  };
  const { data, error } = await supabase.from("loops").insert(insertPayload).select().single();
  if (error) throw new Error(error.message);
  return toLoopEntry(data);
}

export async function deleteLoop(id: string) {
  const { error } = await supabase.from("loops").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
