import { supabase } from "@/integrations/supabase/client";

export const createMission = async ({ data }: { data: { title: string; theme: string; description: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  // Check admin role via standard client
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
    
  if (!roleData) throw new Error("Only admins can create missions");

  const { error } = await supabase.from("missions").insert({
    title: data.title,
    theme: data.theme,
    description: data.description,
    created_by: userData.user.id,
  });

  if (error) throw new Error(error.message);
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
        profiles!mission_updates_author_id_fkey (display_name, avatar_url)
      )
    `)
    .eq("id", missionId)
    .single();

  if (error) throw new Error(error.message);
  
  // Sort updates descending
  if (mission.mission_updates) {
    mission.mission_updates.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
