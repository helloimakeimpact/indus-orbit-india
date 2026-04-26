import { supabase } from "@/integrations/supabase/client";

// 1. Stories
export const submitStory = async ({ data }: { data: { title: string; content: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { error } = await supabase.from("stories").insert({
    author_id: userData.user.id,
    title: data.title,
    content: data.content,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getPublishedStories = async () => {
  const { data } = await supabase
    .from("stories")
    .select("*, profiles!stories_author_id_fkey(display_name, avatar_url, headline)")
    .in("status", ["approved", "featured"])
    .order("published_at", { ascending: false });
  return data ?? [];
};

// 2. Events
export const submitEvent = async ({ data }: { data: { title: string; description: string; startTime: string; endTime: string; locationType: "virtual"|"irl"; location?: string; link?: string; chapterId?: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { error } = await supabase.from("events").insert({
    organizer_id: userData.user.id,
    title: data.title,
    description: data.description,
    start_time: data.startTime,
    end_time: data.endTime,
    location_type: data.locationType,
    location: data.location,
    link: data.link,
    chapter_id: data.chapterId,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getApprovedEvents = async () => {
  const { data } = await supabase
    .from("events")
    .select("*, chapters(name), profiles!events_organizer_id_fkey(display_name)")
    .eq("status", "approved")
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true });
  return data ?? [];
};

// 3. Chapters
export const createChapter = async ({ data }: { data: { name: string; city?: string; country?: string; description?: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Check admin role via standard client
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
    
  if (!roleData) throw new Error("Only admins can create chapters");

  const { error } = await supabase.from("chapters").insert({
    name: data.name,
    city: data.city || null,
    country: data.country || null,
    description: data.description || "",
  });

  if (error) throw new Error(error.message);
  
  await supabase.from("audit_log").insert({
    actor_id: userData.user.id,
    action: "chapter.created",
    target_type: "chapter",
  });

  return { ok: true };
};

export const getChapters = async () => {
  const { data } = await supabase
    .from("chapters")
    .select("*, chapter_members(user_id, role, profiles(display_name, avatar_url))")
    .order("name", { ascending: true });
  return data ?? [];
};

export const joinChapter = async ({ data }: { data: { chapterId: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { error } = await supabase.from("chapter_members").upsert({
    chapter_id: data.chapterId,
    user_id: userData.user.id,
    role: "member"
  });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getMyAdminChapters = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // First find chapters where user is lead
  const { data: memberData } = await supabase
    .from("chapter_members")
    .select("chapter_id")
    .eq("user_id", userData.user.id)
    .eq("role", "lead");

  if (!memberData || memberData.length === 0) return [];
  const chapterIds = memberData.map(m => m.chapter_id);

  const { data } = await supabase
    .from("chapters")
    .select("*, chapter_members(user_id, role, created_at, profiles(display_name, headline, city, is_verified))")
    .in("id", chapterIds)
    .order("name", { ascending: true });

  return data ?? [];
};

export const removeChapterMember = async ({ data }: { data: { chapterId: string; targetUserId: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Verify caller is a lead
  const { data: leadCheck } = await supabase
    .from("chapter_members")
    .select("role")
    .eq("chapter_id", data.chapterId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!leadCheck || leadCheck.role !== "lead") throw new Error("Only chapter leads can remove members");

  const { error } = await supabase
    .from("chapter_members")
    .delete()
    .eq("chapter_id", data.chapterId)
    .eq("user_id", data.targetUserId);

  if (error) throw new Error(error.message);
  return { ok: true };
};

export const updateChapterDetails = async ({ data }: { data: { chapterId: string; description: string; city: string; country: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Verify caller is a lead
  const { data: leadCheck } = await supabase
    .from("chapter_members")
    .select("role")
    .eq("chapter_id", data.chapterId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!leadCheck || leadCheck.role !== "lead") throw new Error("Only chapter leads can update details");

  const { error } = await supabase
    .from("chapters")
    .update({ 
      description: data.description,
      city: data.city,
      country: data.country 
    })
    .eq("id", data.chapterId);

  if (error) throw new Error(error.message);
  return { ok: true };
};

// 4. Spotlights
export const getSpotlights = async () => {
  const { data } = await supabase
    .from("spotlights")
    .select("*, profiles!spotlights_user_id_fkey(*)")
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
};
