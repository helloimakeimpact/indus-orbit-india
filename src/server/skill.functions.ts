import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type Skill = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  hero_image_url: string | null;
  status: "draft" | "published";
  featured_on: string | null;
  category: string;
  tags: string[];
  badges: string[];
  when_to_use: string | null;
  prerequisites: Array<{ label: string }>;
  steps: Array<{ title: string; body: string }>;
  time_estimate: string | null;
  cost_estimate: string | null;
  common_pitfalls: string | null;
  india_context_notes: string | null;
  templates: Array<{ label: string; url: string; kind?: string }>;
  referenced_tools: string[];
  legal_refs: string[];
  score_clarity: number;
  score_completeness: number;
  score_india_fit: number;
  score_freshness: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listPublishedSkills() {
  const { data, error } = await sb
    .from("skills")
    .select("*")
    .eq("status", "published")
    .order("featured_on", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Skill[];
}

export async function listAllSkillsForAdmin() {
  const { data, error } = await sb.from("skills").select("*").order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Skill[];
}

export async function getSkillBySlug(slug: string) {
  const { data, error } = await sb.from("skills").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Skill | null;
}

export async function upsertSkill(input: Partial<Skill> & { id?: string }) {
  const { data: userData } = await supabase.auth.getUser();
  const payload: any = { ...input };
  if (payload.status === "published" && !payload.published_at) payload.published_at = new Date().toISOString();
  if (!payload.id) payload.created_by = userData.user?.id;
  delete payload.created_at;
  delete payload.updated_at;
  const { data, error } = await sb.from("skills").upsert(payload, { onConflict: "id" }).select().single();
  if (error) throw new Error(error.message);
  return data as Skill;
}

export async function deleteSkill(id: string) {
  const { error } = await sb.from("skills").delete().eq("id", id);
  if (error) throw new Error(error.message);
}