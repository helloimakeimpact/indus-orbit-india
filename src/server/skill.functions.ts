import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type SkillRow = Database["public"]["Tables"]["skills"]["Row"];
type SkillInsert = Database["public"]["Tables"]["skills"]["Insert"];
type SkillUpdate = Database["public"]["Tables"]["skills"]["Update"];

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

type SkillInput = Partial<Skill> & { id?: string };

function asArray<T>(value: Json): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toSkillStatus(status: string): Skill["status"] {
  if (status === "draft" || status === "published") return status;
  throw new Error(`Unsupported skill status: ${status}`);
}

function toSkill(row: SkillRow): Skill {
  return {
    ...row,
    status: toSkillStatus(row.status),
    prerequisites: asArray<Skill["prerequisites"][number]>(row.prerequisites),
    steps: asArray<Skill["steps"][number]>(row.steps),
    templates: asArray<Skill["templates"][number]>(row.templates),
  };
}

function getSkillPayload(input: SkillInput): SkillUpdate {
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...payload } = input;

  return payload;
}

export async function listPublishedSkills() {
  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .eq("status", "published")
    .order("featured_on", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toSkill);
}

export async function listAllSkillsForAdmin() {
  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toSkill);
}

export async function getSkillBySlug(slug: string) {
  const { data, error } = await supabase.from("skills").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSkill(data) : null;
}

export async function upsertSkill(input: SkillInput) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const payload = getSkillPayload(input);
  if (payload.status === "published" && !payload.published_at) {
    payload.published_at = new Date().toISOString();
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("skills")
      .update(payload)
      .eq("id", input.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toSkill(data);
  }

  const slug = input.slug?.trim();
  const title = input.title?.trim();
  if (!slug || !title) throw new Error("Title and slug are required.");

  const insertPayload: SkillInsert = {
    ...payload,
    slug,
    title,
    created_by: userData.user.id,
  };
  const { data, error } = await supabase.from("skills").insert(insertPayload).select().single();
  if (error) throw new Error(error.message);
  return toSkill(data);
}

export async function deleteSkill(id: string) {
  const { error } = await supabase.from("skills").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
