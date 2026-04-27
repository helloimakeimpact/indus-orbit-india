import { supabase } from "@/integrations/supabase/client";

export const createMission = async ({ data }: { data: { title: string; theme: string; description: string; chapterId?: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Check admin role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
    
  let canCreate = !!roleData;

  // If not admin, check if they are a chapter lead for the provided chapter
  if (!canCreate && data.chapterId) {
    const { data: leadData } = await supabase
      .from("chapter_members")
      .select("role")
      .eq("chapter_id", data.chapterId)
      .eq("user_id", userData.user.id)
      .eq("role", "lead")
      .maybeSingle();
    if (leadData) canCreate = true;
  }

  if (!canCreate) throw new Error("Only admins or chapter leads can create missions");

  const { data: newMission, error } = await supabase.from("missions").insert({
    title: data.title,
    theme: data.theme,
    description: data.description,
    created_by: userData.user.id,
    chapter_id: data.chapterId || null,
  }).select("id").single();

  if (error) throw new Error(error.message);

  // Auto-add the creator as a lead of the mission
  if (newMission) {
    await supabase.from("mission_members").insert({
      mission_id: newMission.id,
      user_id: userData.user.id,
      role: "lead",
    });
  }

  return { ok: true };
};

export const joinMission = async ({ data }: { data: { missionId: string; role: "contributor" | "founder"; commitmentType?: string; message?: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  
  const { error } = await supabase.from("mission_members").upsert({
    mission_id: data.missionId,
    user_id: userData.user.id,
    role: data.role,
    commitment_type: data.commitmentType,
    message: data.message,
  });

  if (error) throw new Error(error.message);
  return { ok: true };
};

export const removeMissionMember = async ({ data }: { data: { missionId: string; targetUserId: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Use SECURITY DEFINER function to bypass self-referencing RLS
  const { error } = await supabase.rpc("lead_remove_mission_member" as any, {
    _mission_id: data.missionId,
    _target_user_id: data.targetUserId,
  });

  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getMissions = async () => {
  const { data: missions, error } = await supabase
    .from("missions")
    .select(`
      *,
      mission_members (
        user_id,
        role,
        commitment_type,
        message,
        profiles:user_id (display_name, avatar_url, orbit_segment)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return missions ?? [];
};

export const updateMissionStatus = async ({ data }: { data: { missionId: string; status: "open" | "completed" | "archived" } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Check admin role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
    
  if (!roleData) throw new Error("Only admins can update missions");

  const { error } = await supabase
    .from("missions")
    .update({ status: data.status })
    .eq("id", data.missionId);

  if (error) throw new Error(error.message);
  
  await supabase.from("audit_log").insert({
    actor_id: userData.user.id,
    action: `mission.status_updated_to_${data.status}`,
    target_type: "mission",
    target_id: data.missionId,
  });

  return { ok: true };
};

export const getMission = async (missionId: string) => {
  const { data: mission, error } = await supabase
    .from("missions")
    .select(`
      *,
      mission_members (
        user_id,
        role,
        profiles!mission_members_user_id_fkey (display_name, avatar_url, orbit_segment)
      ),
      mission_updates (
        id,
        content,
        created_at,
        is_pinned,
        profiles!mission_updates_author_id_fkey (display_name, avatar_url)
      ),
      events (
        id,
        title,
        start_time,
        location_type
      ),
      stories (
        id,
        title,
        status,
        published_at
      )
    `)
    .eq("id", missionId)
    .single();

  if (error) throw new Error(error.message);
  
  // Sort updates: pinned first, then descending by date
  if (mission.mission_updates) {
    mission.mission_updates.sort((a: any, b: any) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  // Sort members: leads first
  if (mission.mission_members) {
    mission.mission_members.sort((a: any, b: any) => {
      if (a.role === 'lead' && b.role !== 'lead') return -1;
      if (a.role !== 'lead' && b.role === 'lead') return 1;
      return 0;
    });
  }

  return mission;
};

export const postMissionUpdate = async ({ data }: { data: { missionId: string; content: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { error, data: updateRow } = await supabase.from("mission_updates").insert({
    mission_id: data.missionId,
    author_id: userData.user.id,
    content: data.content
  }).select().single();

  if (error) throw new Error(error.message);

  // Trigger notifications
  const { data: members } = await supabase.from("mission_members").select("user_id").eq("mission_id", data.missionId);
  const { data: mission } = await supabase.from("missions").select("title").eq("id", data.missionId).single();
  
  if (members && mission) {
    const notifications = members
      .filter(m => m.user_id !== userData.user!.id)
      .map(m => ({
        user_id: m.user_id,
        category: "mission_updates",
        type: "mission_updates",
        message: `New update in mission: ${mission.title}`,
        link: `/app/missions_/${data.missionId}`
      }));
      
    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }
  }

  return { ok: true, update: updateRow };
};
export const pinMissionUpdate = async (updateId: string, isPinned: boolean) => {
  const { error } = await supabase
    .from("mission_updates")
    .update({ is_pinned: isPinned })
    .eq("id", updateId);

  if (error) throw new Error(error.message);
  return { ok: true };
};
