import { supabase } from "@/integrations/supabase/client";
import { sendNotification } from "@/server/notification.functions";

// 1. Stories
export const submitStory = async ({
  data,
}: {
  data: { title: string; content: string; chapterId?: string };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  const title = data.title.trim();
  const content = data.content.trim();
  if (!title) throw new Error("Story title is required");
  if (!content) throw new Error("Story content is required");

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
    title,
    content,
    chapter_id: data.chapterId || null,
    status,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getPublishedStories = async () => {
  const { data, error } = await supabase
    .from("stories")
    .select("*, profiles!stories_author_id_fkey(display_name, avatar_url, headline)")
    .in("status", ["approved", "featured"])
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
};

// 2. Events
export const submitEvent = async ({
  data,
}: {
  data: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    locationType: "virtual" | "irl";
    location?: string;
    link?: string;
    chapterId?: string;
  };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  const title = data.title.trim();
  const description = data.description.trim();
  const location = data.location?.trim() || undefined;
  const link = data.link?.trim() || undefined;
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (!title) throw new Error("Event title is required");
  if (!description) throw new Error("Event description is required");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Event start and end times are required");
  }
  if (end <= start) throw new Error("Event end time must be after the start time");
  if (data.locationType === "irl" && !location) {
    throw new Error("Add a venue or address for in-person events");
  }
  if (data.locationType === "virtual" && !location && !link) {
    throw new Error("Add an online location or join link for virtual events");
  }

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
    title,
    description,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    location_type: data.locationType,
    location,
    link,
    chapter_id: data.chapterId,
    status,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getApprovedEvents = async () => {
  const { data, error } = await supabase
    .from("events")
    .select("*, chapters(name), profiles!events_organizer_id_fkey(display_name)")
    .eq("status", "approved")
    .order("start_time", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};

// 3. Chapters
export const createChapter = async ({
  data,
}: {
  data: { name: string; city?: string; country?: string; description?: string };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  const name = data.name.trim();
  if (!name) throw new Error("Chapter name is required");

  // Check admin role via standard client
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) throw new Error("Only admins can create chapters");

  const { error } = await supabase.from("chapters").insert({
    name,
    city: data.city?.trim() || null,
    country: data.country?.trim() || null,
    description: data.description?.trim() || "",
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
  const { data, error } = await supabase
    .from("chapters")
    .select("*, chapter_members(user_id, role, profiles(display_name, avatar_url))")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const joinChapter = async ({ data }: { data: { chapterId: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: existing, error: lookupError } = await supabase
    .from("chapter_members")
    .select("role")
    .eq("chapter_id", data.chapterId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) return { ok: true };

  const { error } = await supabase.from("chapter_members").insert({
    chapter_id: data.chapterId,
    user_id: userData.user.id,
    role: "member",
  });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getMyAdminChapters = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // First find chapters where user is lead
  const { data: memberData, error: memberError } = await supabase
    .from("chapter_members")
    .select("chapter_id")
    .eq("user_id", userData.user.id)
    .eq("role", "lead");
  if (memberError) throw new Error(memberError.message);

  if (!memberData || memberData.length === 0) return [];
  const chapterIds = memberData.map((m) => m.chapter_id);

  const { data, error } = await supabase
    .from("chapters")
    .select(
      "*, chapter_members(user_id, role, created_at, profiles(display_name, headline, city, is_verified))",
    )
    .in("id", chapterIds)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);

  return data ?? [];
};

export const removeChapterMember = async ({
  data,
}: {
  data: { chapterId: string; targetUserId: string };
}) => {
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

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleData) throw new Error("Only admins can view proposals");

  const { data, error } = await supabase
    .from("chapter_proposals")
    .select("*, profiles!chapter_proposals_proposer_id_fkey(display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return data ?? [];
};

export const approveChapterProposal = async ({
  data,
}: {
  data: {
    proposalId: string;
    proposerId: string;
    name: string;
    city: string;
    country: string;
    rationale: string;
  };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleData) throw new Error("Only admins can approve proposals");

  // 1. Create the chapter
  const { error: chapterError, data: newChapter } = await supabase
    .from("chapters")
    .insert({
      name: data.name.trim(),
      city: data.city.trim(),
      country: data.country.trim(),
      description: data.rationale.trim().slice(0, 200), // basic description from rationale
    })
    .select("id")
    .single();

  if (chapterError) throw new Error(chapterError.message);

  // 2. Make proposer a lead
  const { error: memberError } = await supabase.from("chapter_members").insert({
    chapter_id: newChapter.id,
    user_id: data.proposerId,
    role: "lead",
  });
  if (memberError) throw new Error(memberError.message);

  // 3. Mark proposal as approved
  const { error: proposalError } = await supabase
    .from("chapter_proposals")
    .update({
      status: "approved",
    })
    .eq("id", data.proposalId);
  if (proposalError) throw new Error(proposalError.message);

  // 4. Send Notification
  await sendNotification({
    userId: data.proposerId,
    type: "chapter_approved",
    message: `Your proposal for ${data.name} was approved! You are now the Lead.`,
    link: "/app/chapters",
  });

  return { ok: true };
};

export const rejectChapterProposal = async (proposalId: string) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleData) throw new Error("Only admins can reject proposals");

  const { error } = await supabase
    .from("chapter_proposals")
    .update({
      status: "rejected",
    })
    .eq("id", proposalId);
  if (error) throw new Error(error.message);

  return { ok: true };
};

export const updateChapterDetails = async ({
  data,
}: {
  data: { chapterId: string; description: string; city: string; country: string };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Verify caller is a lead
  const { data: leadCheck, error: leadError } = await supabase
    .from("chapter_members")
    .select("role")
    .eq("chapter_id", data.chapterId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (leadError) throw new Error(leadError.message);

  if (!leadCheck || leadCheck.role !== "lead")
    throw new Error("Only chapter leads can update details");

  const { error } = await supabase
    .from("chapters")
    .update({
      description: data.description.trim(),
      city: data.city.trim(),
      country: data.country.trim(),
    })
    .eq("id", data.chapterId);

  if (error) throw new Error(error.message);
  return { ok: true };
};

// 4. Spotlights
export const getSpotlights = async () => {
  const { data, error } = await supabase
    .from("spotlights")
    .select("*, profiles!spotlights_user_id_fkey(*)")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  return data ?? [];
};

// ---------- Lead inbox: pending stories & events for chapters I lead ----------

export const getLeadInbox = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: leadRows, error: leadRowsError } = await supabase
    .from("chapter_members")
    .select("chapter_id")
    .eq("user_id", userData.user.id)
    .eq("role", "lead");
  if (leadRowsError) throw new Error(leadRowsError.message);

  const chapterIds = (leadRows ?? []).map((r) => r.chapter_id);
  if (chapterIds.length === 0) return { stories: [], events: [], chapters: [] };

  const [chapters, stories, events] = await Promise.all([
    supabase.from("chapters").select("id, name").in("id", chapterIds),
    supabase
      .from("stories")
      .select(
        "id, title, content, status, created_at, chapter_id, profiles!stories_author_id_fkey(display_name)",
      )
      .in("chapter_id", chapterIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select(
        "id, title, description, start_time, location, location_type, status, chapter_id, profiles!events_organizer_id_fkey(display_name)",
      )
      .in("chapter_id", chapterIds)
      .eq("status", "pending")
      .order("start_time", { ascending: true }),
  ]);
  if (chapters.error) throw new Error(chapters.error.message);
  if (stories.error) throw new Error(stories.error.message);
  if (events.error) throw new Error(events.error.message);

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
  const { error } = await (supabase.rpc as any)("lead_reject_story", {
    _story_id: data.storyId,
    _reason: data.reason ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const approveEvent = async ({ data }: { data: { eventId: string } }) => {
  const { error } = await (supabase.rpc as any)("lead_approve_event", { _event_id: data.eventId });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const rejectEvent = async ({ data }: { data: { eventId: string; reason?: string } }) => {
  const { error } = await (supabase.rpc as any)("lead_reject_event", {
    _event_id: data.eventId,
    _reason: data.reason ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ---------- Mission admin: chapters/missions I lead ----------

export const getMyAdminMissions = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: leadRows, error: leadRowsError } = await supabase
    .from("mission_members")
    .select("mission_id")
    .eq("user_id", userData.user.id)
    .eq("role", "lead");
  if (leadRowsError) throw new Error(leadRowsError.message);

  const missionIds = (leadRows ?? []).map((r) => r.mission_id);
  if (missionIds.length === 0) return [];

  const { data, error } = await supabase
    .from("missions")
    .select(
      `
      *,
      mission_members(user_id, role, created_at, profiles(display_name, headline, is_verified))
    `,
    )
    .in("id", missionIds)
    .order("title", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};
