import { supabase } from "@/integrations/supabase/client";

// 1. Stories
export const submitStory = async ({ data }: { data: { title: string; content: string; chapterId?: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  let status = "pending";
  if (data.chapterId) {
    const { data: leadData } = await supabase
      .from("chapter_members")
      .select("role")
      .eq("chapter_id", data.chapterId)
      .eq("user_id", userData.user.id)
      .eq("role", "lead")
      .maybeSingle();
    if (leadData) status = "approved";
  }

  const { error } = await supabase.from("stories").insert({
    author_id: userData.user.id,
    title: data.title,
    content: data.content,
    chapter_id: data.chapterId || null,
    status,
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

  let status = "pending";
  if (data.chapterId) {
    const { data: leadData } = await supabase
      .from("chapter_members")
      .select("role")
      .eq("chapter_id", data.chapterId)
      .eq("user_id", userData.user.id)
      .eq("role", "lead")
      .maybeSingle();
    if (leadData) status = "approved";
  }

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
    status,
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

  // Use SECURITY DEFINER function to bypass self-referencing RLS
  const { error } = await supabase.rpc("lead_remove_chapter_member" as any, {
    _chapter_id: data.chapterId,
    _target_user_id: data.targetUserId,
  });

  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getChapterProposals = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
  if (!roleData) throw new Error("Only admins can view proposals");

  const { data } = await supabase
    .from("chapter_proposals")
    .select("*, profiles!chapter_proposals_proposer_id_fkey(display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
    
  return data ?? [];
};

export const approveChapterProposal = async ({ data }: { data: { proposalId: string; proposerId: string; name: string; city: string; country: string; rationale: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
  if (!roleData) throw new Error("Only admins can approve proposals");

  // 1. Create the chapter
  const { error: chapterError, data: newChapter } = await supabase.from("chapters").insert({
    name: data.name,
    city: data.city,
    country: data.country,
    description: data.rationale.substring(0, 200) + "...", // basic description from rationale
  }).select("id").single();

  if (chapterError) throw new Error(chapterError.message);

  // 2. Make proposer a lead
  await supabase.from("chapter_members").insert({
    chapter_id: newChapter.id,
    user_id: data.proposerId,
    role: "lead"
  });

  // 3. Mark proposal as approved
  await supabase.from("chapter_proposals").update({
    status: "approved"
  }).eq("id", data.proposalId);

  // 4. Send Notification
  await supabase.from("notifications").insert({
    user_id: data.proposerId,
    type: "chapter_approved",
    message: `Your proposal for ${data.name} was approved! You are now the Lead.`,
    link: "/app/chapters",
  });

  return { ok: true };
};

export const rejectChapterProposal = async (proposalId: string) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
  if (!roleData) throw new Error("Only admins can reject proposals");

  await supabase.from("chapter_proposals").update({
    status: "rejected"
  }).eq("id", proposalId);

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

// ---------- Lead inbox: pending stories & events for chapters I lead ----------

export const getLeadInbox = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: leadRows } = await supabase
    .from("chapter_members")
    .select("chapter_id")
    .eq("user_id", userData.user.id)
    .eq("role", "lead");

  const chapterIds = (leadRows ?? []).map((r) => r.chapter_id);
  if (chapterIds.length === 0) return { stories: [], events: [], chapters: [] };

  const [chapters, stories, events] = await Promise.all([
    supabase.from("chapters").select("id, name").in("id", chapterIds),
    supabase
      .from("stories")
      .select("id, title, content, status, created_at, chapter_id, profiles!stories_author_id_fkey(display_name)")
      .in("chapter_id", chapterIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("id, title, description, start_time, status, chapter_id, profiles!events_organizer_id_fkey(display_name)")
      .in("chapter_id", chapterIds)
      .eq("status", "pending")
      .order("start_time", { ascending: true }),
  ]);

  return {
    chapters: chapters.data ?? [],
    stories: stories.data ?? [],
    events: events.data ?? [],
  };
};

export const approveStory = async ({ data }: { data: { storyId: string } }) => {
  const { error } = await (supabase.rpc as any)("lead_approve_story", { _story_id: data.storyId });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const rejectStory = async ({ data }: { data: { storyId: string; reason?: string } }) => {
  const { error } = await (supabase.rpc as any)("lead_reject_story", { _story_id: data.storyId, _reason: data.reason ?? null });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const approveEvent = async ({ data }: { data: { eventId: string } }) => {
  const { error } = await (supabase.rpc as any)("lead_approve_event", { _event_id: data.eventId });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const rejectEvent = async ({ data }: { data: { eventId: string; reason?: string } }) => {
  const { error } = await (supabase.rpc as any)("lead_reject_event", { _event_id: data.eventId, _reason: data.reason ?? null });
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ---------- Mission admin: chapters/missions I lead ----------

export const getMyAdminMissions = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: leadRows } = await supabase
    .from("mission_members")
    .select("mission_id")
    .eq("user_id", userData.user.id)
    .eq("role", "lead");

  const missionIds = (leadRows ?? []).map((r) => r.mission_id);
  if (missionIds.length === 0) return [];

  const { data } = await supabase
    .from("missions")
    .select(`
      *,
      mission_members(user_id, role, created_at, profiles(display_name, headline, is_verified))
    `)
    .in("id", missionIds)
    .order("title", { ascending: true });
  return data ?? [];
};
