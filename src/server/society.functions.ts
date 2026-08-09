import { supabase } from "@/integrations/supabase/client";
import { isMissingSchemaContract } from "@/integrations/supabase/schema-compat";

async function isActiveChapterLead(userId: string, chapterId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("chapter_members")
    .select("role")
    .eq("chapter_id", chapterId)
    .eq("user_id", userId)
    .eq("role", "lead")
    .eq("membership_state", "active")
    .maybeSingle();
  if (!error) return !!data;
  if (!isMissingSchemaContract(error)) throw new Error(error.message);

  const { data: legacyData, error: legacyError } = await supabase
    .from("chapter_members")
    .select("role")
    .eq("chapter_id", chapterId)
    .eq("user_id", userId)
    .eq("role", "lead")
    .maybeSingle();
  if (legacyError) throw new Error(legacyError.message);
  return !!legacyData;
}

async function getActiveLeadChapterIds(userId: string): Promise<string[]> {
  const current = await supabase
    .from("chapter_members")
    .select("chapter_id")
    .eq("user_id", userId)
    .eq("role", "lead")
    .eq("membership_state", "active");
  if (!current.error) return (current.data ?? []).map((row) => row.chapter_id);
  if (!isMissingSchemaContract(current.error)) throw new Error(current.error.message);

  const legacy = await supabase
    .from("chapter_members")
    .select("chapter_id")
    .eq("user_id", userId)
    .eq("role", "lead");
  if (legacy.error) throw new Error(legacy.error.message);
  return (legacy.data ?? []).map((row) => row.chapter_id);
}

async function getActiveLeadMissionIds(userId: string): Promise<string[]> {
  const current = await supabase
    .from("mission_members")
    .select("mission_id")
    .eq("user_id", userId)
    .eq("role", "lead")
    .eq("membership_state", "active");
  if (!current.error) return (current.data ?? []).map((row) => row.mission_id);
  if (!isMissingSchemaContract(current.error)) throw new Error(current.error.message);

  const legacy = await supabase
    .from("mission_members")
    .select("mission_id")
    .eq("user_id", userId)
    .eq("role", "lead");
  if (legacy.error) throw new Error(legacy.error.message);
  return (legacy.data ?? []).map((row) => row.mission_id);
}

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
  if (data.chapterId && (await isActiveChapterLead(userData.user.id, data.chapterId))) {
    status = "approved";
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
  if (data.chapterId && (await isActiveChapterLead(userData.user.id, data.chapterId))) {
    status = "approved";
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
  const city = data.city?.trim() ?? "";
  const country = data.country?.trim() ?? "";
  const description = data.description?.trim() ?? "";
  if (!name) throw new Error("Chapter name is required");
  if (!city) throw new Error("Chapter base city is required");
  if (!country) throw new Error("Chapter base country is required");
  if (!description) throw new Error("Chapter description is required");

  const { data: chapter, error: contractError } = await supabase.rpc("create_managed_chapter", {
    _name: name,
    _city: city,
    _country: country,
    _description: description,
    _join_policy: "request",
    _visibility: "discoverable",
    _client_request_id: crypto.randomUUID(),
  });
  if (!contractError) return { ok: true, chapter };
  if (!isMissingSchemaContract(contractError)) throw new Error(contractError.message);

  // Rolling-deployment fallback for the hosted schema before the RPC migration.
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) throw new Error("Only admins can create chapters");

  const { error } = await supabase.from("chapters").insert({
    name,
    city,
    country,
    description,
  });

  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    actor_id: userData.user.id,
    action: "chapter.created",
    target_type: "chapter",
  });

  return { ok: true, chapter: null };
};

export const getChapters = async () => {
  const { data, error } = await supabase
    .from("chapters")
    .select(
      "*, chapter_members(*, profiles!chapter_members_user_id_fkey(display_name, avatar_url))",
    )
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const joinChapter = async ({ data }: { data: { chapterId: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: space, error: spaceError } = await supabase
    .from("conversation_spaces")
    .select("id")
    .eq("chapter_id", data.chapterId)
    .maybeSingle();

  if (!spaceError && space) {
    const { data: membership, error: contractError } = await supabase.rpc(
      "request_my_space_membership",
      {
        _space_id: space.id,
        _requested_role: "member",
        _message: "",
        _client_request_id: crypto.randomUUID(),
      },
    );
    if (!contractError) {
      const membershipState =
        membership && typeof membership === "object" && !Array.isArray(membership)
          ? String(membership.membership_state ?? "requested")
          : "requested";
      return { ok: true, membershipState };
    }
    if (!isMissingSchemaContract(contractError)) throw new Error(contractError.message);
  } else if (spaceError && !isMissingSchemaContract(spaceError)) {
    throw new Error(spaceError.message);
  } else if (!spaceError && !space) {
    throw new Error("This Chapter does not have an active collaboration Space");
  }

  // Rolling-deployment fallback for the hosted schema before Spaces exist.
  const { data: existing, error: lookupError } = await supabase
    .from("chapter_members")
    .select("role")
    .eq("chapter_id", data.chapterId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) return { ok: true, membershipState: "active" };

  const { error } = await supabase.from("chapter_members").insert({
    chapter_id: data.chapterId,
    user_id: userData.user.id,
    role: "member",
  });
  if (error) throw new Error(error.message);
  return { ok: true, membershipState: "active" };
};

export const getMyAdminChapters = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const chapterIds = await getActiveLeadChapterIds(userData.user.id);
  if (chapterIds.length === 0) return [];

  const { data, error } = await supabase
    .from("chapters")
    .select(
      "*, chapter_members(*, profiles!chapter_members_user_id_fkey(display_name, headline, city, is_verified))",
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

  const [{ data: space, error: spaceError }, { data: membership, error: memberError }] =
    await Promise.all([
      supabase
        .from("conversation_spaces")
        .select("id")
        .eq("chapter_id", data.chapterId)
        .maybeSingle(),
      supabase
        .from("chapter_members")
        .select("role, state_version")
        .eq("chapter_id", data.chapterId)
        .eq("user_id", data.targetUserId)
        .maybeSingle(),
    ]);

  if (!spaceError && !memberError && space && membership) {
    const { error: contractError } = await supabase.rpc("decide_space_membership", {
      _space_id: space.id,
      _target_user_id: data.targetUserId,
      _decision: "remove",
      _role: membership.role,
      _reason: "Removed by a Chapter lead or steward",
      _expected_version: membership.state_version,
    });
    if (!contractError) return { ok: true };
    if (!isMissingSchemaContract(contractError)) throw new Error(contractError.message);
  } else {
    const firstError = spaceError ?? memberError;
    if (firstError && !isMissingSchemaContract(firstError)) throw new Error(firstError.message);
    if (!firstError && (!space || !membership)) throw new Error("Chapter membership not found");
  }

  // Rolling-deployment fallback for the hosted schema before Spaces exist.
  const { error } = await supabase
    .from("chapter_members")
    .delete()
    .eq("chapter_id", data.chapterId)
    .eq("user_id", data.targetUserId);

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

  return (data ?? []).map((proposal) => ({
    ...proposal,
    profiles: Array.isArray(proposal.profiles) ? (proposal.profiles[0] ?? null) : proposal.profiles,
  }));
};

export const approveChapterProposal = async (proposalId: string) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { error } = await supabase.rpc("approve_chapter_proposal", {
    _proposal_id: proposalId,
  });
  if (error) throw new Error(error.message);

  return { ok: true };
};

export const rejectChapterProposal = async (proposalId: string) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { error } = await supabase.rpc("reject_chapter_proposal", {
    _proposal_id: proposalId,
  });
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

  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select("state_version, country_code, visibility, join_policy")
    .eq("id", data.chapterId)
    .single();

  if (!chapterError && chapter) {
    const { data: updated, error: contractError } = await supabase.rpc(
      "update_my_chapter_details",
      {
        _chapter_id: data.chapterId,
        _description: data.description.trim(),
        _city: data.city.trim(),
        _country: data.country.trim(),
        _country_code: chapter.country_code ?? (null as unknown as string),
        _visibility: chapter.visibility,
        _join_policy: chapter.join_policy,
        _expected_version: chapter.state_version,
      },
    );
    if (!contractError) return { ok: true, chapter: updated };
    if (!isMissingSchemaContract(contractError)) throw new Error(contractError.message);
  } else if (chapterError && !isMissingSchemaContract(chapterError)) {
    throw new Error(chapterError.message);
  }

  // Rolling-deployment fallback for the hosted schema before lifecycle columns.
  if (!(await isActiveChapterLead(userData.user.id, data.chapterId)))
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
  return { ok: true, chapter: null };
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

  const chapterIds = await getActiveLeadChapterIds(userData.user.id);
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
  const { error } = await supabase.rpc("lead_approve_story", { _story_id: data.storyId });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const rejectStory = async ({ data }: { data: { storyId: string; reason?: string } }) => {
  const { error } = await supabase.rpc("lead_reject_story", {
    _story_id: data.storyId,
    _reason: data.reason,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const approveEvent = async ({ data }: { data: { eventId: string } }) => {
  const { error } = await supabase.rpc("lead_approve_event", { _event_id: data.eventId });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const rejectEvent = async ({ data }: { data: { eventId: string; reason?: string } }) => {
  const { error } = await supabase.rpc("lead_reject_event", {
    _event_id: data.eventId,
    _reason: data.reason,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
};

// ---------- Mission admin: chapters/missions I lead ----------

export const getMyAdminMissions = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const missionIds = await getActiveLeadMissionIds(userData.user.id);
  if (missionIds.length === 0) return [];

  const { data, error } = await supabase
    .from("missions")
    .select(
      `
      *,
      mission_members(*, profiles!mission_members_user_id_fkey(display_name, headline, is_verified))
    `,
    )
    .in("id", missionIds)
    .order("title", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};
