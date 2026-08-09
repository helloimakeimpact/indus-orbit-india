import { supabase } from "@/integrations/supabase/client";
import { isMissingSchemaContract } from "@/integrations/supabase/schema-compat";

type MissionStatus = "open" | "paused" | "completed" | "closed" | "archived";
type MissionLifecycle =
  | "draft"
  | "submitted_for_review"
  | "needs_information"
  | "approved"
  | "recruiting"
  | "active"
  | "paused"
  | "completed"
  | "archived"
  | "cancelled"
  | "rejected"
  | "withdrawn";

async function hasAdminRole(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function isMissionLead(userId: string, missionId: string) {
  const { data, error } = await supabase
    .from("mission_members")
    .select("role")
    .eq("mission_id", missionId)
    .eq("user_id", userId)
    .eq("role", "lead")
    .eq("membership_state", "active")
    .maybeSingle();
  if (error && isMissingSchemaContract(error)) {
    const { data: legacyData } = await supabase
      .from("mission_members")
      .select("role")
      .eq("mission_id", missionId)
      .eq("user_id", userId)
      .eq("role", "lead")
      .maybeSingle();
    return !!legacyData;
  }
  if (error) throw new Error(error.message);
  return !!data;
}

async function isMissionMember(userId: string, missionId: string) {
  const { data, error } = await supabase
    .from("mission_members")
    .select("user_id")
    .eq("mission_id", missionId)
    .eq("user_id", userId)
    .eq("membership_state", "active")
    .maybeSingle();
  if (error && isMissingSchemaContract(error)) {
    const { data: legacyData } = await supabase
      .from("mission_members")
      .select("user_id")
      .eq("mission_id", missionId)
      .eq("user_id", userId)
      .maybeSingle();
    return !!legacyData;
  }
  if (error) throw new Error(error.message);
  return !!data;
}

async function canManageMission(userId: string, missionId: string) {
  return (await hasAdminRole(userId)) || (await isMissionLead(userId, missionId));
}

function pathToRecruiting(current: MissionLifecycle): MissionLifecycle[] {
  switch (current) {
    case "draft":
      return ["submitted_for_review", "approved", "recruiting"];
    case "needs_information":
      return ["submitted_for_review", "approved", "recruiting"];
    case "submitted_for_review":
      return ["approved", "recruiting"];
    case "approved":
      return ["recruiting"];
    case "recruiting":
    case "active":
    case "paused":
      return [];
    default:
      throw new Error(`Mission lifecycle ${current} cannot be reopened`);
  }
}

function missionTransitionPath(
  current: MissionLifecycle,
  targetStatus: MissionStatus,
): MissionLifecycle[] {
  if (targetStatus === "open") {
    if (current === "paused") return ["active"];
    return pathToRecruiting(current);
  }

  if (targetStatus === "closed") {
    switch (current) {
      case "draft":
      case "submitted_for_review":
        return ["withdrawn"];
      case "needs_information":
        return ["submitted_for_review", "withdrawn"];
      case "approved":
        return ["recruiting", "cancelled"];
      case "recruiting":
      case "active":
      case "paused":
        return ["cancelled"];
      case "cancelled":
      case "rejected":
      case "withdrawn":
      case "archived":
        return [];
      case "completed":
        return ["archived"];
    }
  }

  if (targetStatus === "archived") {
    switch (current) {
      case "archived":
        return [];
      case "completed":
      case "cancelled":
        return ["archived"];
      case "active":
        return ["completed", "archived"];
      case "paused":
        return ["active", "completed", "archived"];
      case "recruiting":
        return ["cancelled", "archived"];
      case "approved":
        return ["recruiting", "cancelled", "archived"];
      case "draft":
      case "submitted_for_review":
      case "needs_information": {
        const toRecruiting = pathToRecruiting(current);
        return [...toRecruiting, "cancelled", "archived"];
      }
      case "rejected":
      case "withdrawn":
        throw new Error(`Mission lifecycle ${current} cannot be archived`);
    }
  }

  const toRecruiting = pathToRecruiting(current);
  const stateAfterRecruiting = toRecruiting.at(-1) ?? current;
  const toActive = stateAfterRecruiting === "recruiting" ? ["active" as const] : [];
  const stateAfterActive = toActive.at(-1) ?? stateAfterRecruiting;

  if (targetStatus === "paused") {
    if (current === "paused") return [];
    if (stateAfterActive !== "active") {
      throw new Error(`Mission lifecycle ${current} cannot be paused`);
    }
    return [...toRecruiting, ...toActive, "paused"];
  }

  if (targetStatus === "completed") {
    if (current === "completed" || current === "archived") return [];
    if (current === "paused") return ["active", "completed"];
    if (stateAfterActive !== "active") {
      throw new Error(`Mission lifecycle ${current} cannot be completed`);
    }
    return [...toRecruiting, ...toActive, "completed"];
  }

  return [];
}

export const createMission = async ({
  data,
}: {
  data: { title: string; theme: string; description: string; chapterId?: string };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const title = data.title.trim();
  const theme = data.theme.trim();
  const description = data.description.trim();
  const clientRequestId = crypto.randomUUID();
  const { data: mission, error: contractError } = await supabase.rpc("create_my_mission", {
    _title: title,
    _theme: theme,
    _description: description,
    _chapter_id: data.chapterId ?? (null as unknown as string),
    _join_policy: "open",
    _visibility: "discoverable",
    _client_request_id: clientRequestId,
  });

  if (!contractError) return { ok: true, mission };
  if (!isMissingSchemaContract(contractError)) throw new Error(contractError.message);

  // Rolling-deployment fallback for the hosted schema before the RPC migration.
  let canCreate = await hasAdminRole(userData.user.id);

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

  const { data: newMission, error } = await supabase
    .from("missions")
    .insert({
      title,
      theme,
      description,
      created_by: userData.user.id,
      chapter_id: data.chapterId || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Auto-add the creator as a lead of the mission
  if (newMission) {
    const { error: memberError } = await supabase.from("mission_members").insert({
      mission_id: newMission.id,
      user_id: userData.user.id,
      role: "lead",
    });
    if (memberError) throw new Error(memberError.message);
  }

  return { ok: true, mission: newMission };
};

export const joinMission = async ({
  data,
}: {
  data: {
    missionId: string;
    role: "contributor" | "founder";
    commitmentType?: string;
    message?: string;
  };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: space, error: spaceError } = await supabase
    .from("conversation_spaces")
    .select("id")
    .eq("mission_id", data.missionId)
    .maybeSingle();

  if (!spaceError && space) {
    const { data: membership, error: contractError } = await supabase.rpc(
      "request_my_space_membership",
      {
        _space_id: space.id,
        _requested_role: data.role,
        _message: data.message ?? data.commitmentType ?? "",
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
    throw new Error("This Mission does not have an active collaboration Space");
  }

  // Rolling-deployment fallback for the hosted schema before Spaces exist.
  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("status")
    .eq("id", data.missionId)
    .single();
  if (missionError) throw new Error(missionError.message);
  if (mission.status !== "open") throw new Error("This mission is not open for joining");

  if (await isMissionMember(userData.user.id, data.missionId)) {
    return { ok: true, membershipState: "active" };
  }

  const { error } = await supabase.from("mission_members").insert({
    mission_id: data.missionId,
    user_id: userData.user.id,
    role: data.role,
    commitment_type: data.commitmentType,
    message: data.message,
  });

  if (error) throw new Error(error.message);
  return { ok: true, membershipState: "active" };
};

export const removeMissionMember = async ({
  data,
}: {
  data: { missionId: string; targetUserId: string };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const [{ data: space, error: spaceError }, { data: membership, error: memberError }] =
    await Promise.all([
      supabase
        .from("conversation_spaces")
        .select("id")
        .eq("mission_id", data.missionId)
        .maybeSingle(),
      supabase
        .from("mission_members")
        .select("role, state_version")
        .eq("mission_id", data.missionId)
        .eq("user_id", data.targetUserId)
        .maybeSingle(),
    ]);

  if (!spaceError && !memberError && space && membership) {
    const { error: contractError } = await supabase.rpc("decide_space_membership", {
      _space_id: space.id,
      _target_user_id: data.targetUserId,
      _decision: "remove",
      _role: membership.role,
      _reason: "Removed by a Mission lead",
      _expected_version: membership.state_version,
    });
    if (!contractError) return { ok: true };
    if (!isMissingSchemaContract(contractError)) throw new Error(contractError.message);
  } else {
    const firstError = spaceError ?? memberError;
    if (firstError && !isMissingSchemaContract(firstError)) throw new Error(firstError.message);
    if (!firstError && (!space || !membership)) throw new Error("Mission membership not found");
  }

  // Rolling-deployment fallback for the hosted schema before Spaces exist.
  const { error } = await supabase
    .from("mission_members")
    .delete()
    .eq("mission_id", data.missionId)
    .eq("user_id", data.targetUserId);

  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getMissions = async () => {
  const { data: missions, error } = await supabase
    .from("missions")
    .select(
      `
      *,
      mission_members (
        *,
        profiles!mission_members_user_id_fkey (display_name, avatar_url, orbit_segment)
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return missions ?? [];
};

export const updateMissionStatus = async ({
  data,
}: {
  data: { missionId: string; status: MissionStatus };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: currentMission, error: lookupError } = await supabase
    .from("missions")
    .select("lifecycle_state, state_version")
    .eq("id", data.missionId)
    .single();

  if (!lookupError && currentMission) {
    const transitions = missionTransitionPath(
      currentMission.lifecycle_state as MissionLifecycle,
      data.status,
    );
    let expectedVersion = currentMission.state_version;

    for (const targetState of transitions) {
      const { data: updated, error: contractError } = await supabase.rpc("transition_my_mission", {
        _mission_id: data.missionId,
        _target_state: targetState,
        _reason: "Changed through the Mission lifecycle controls",
        _expected_version: expectedVersion,
      });

      if (contractError) {
        if (isMissingSchemaContract(contractError)) break;
        throw new Error(contractError.message);
      }
      expectedVersion = updated.state_version;
    }

    if (transitions.length === 0 || expectedVersion !== currentMission.state_version) {
      return { ok: true };
    }
  } else if (lookupError && !isMissingSchemaContract(lookupError)) {
    throw new Error(lookupError.message);
  }

  // Rolling-deployment fallback for the hosted schema before lifecycle RPCs.
  if (!(await canManageMission(userData.user.id, data.missionId))) {
    throw new Error("Only mission leads or admins can update missions");
  }
  const { error } = await supabase
    .from("missions")
    .update({ status: data.status === "paused" ? "closed" : data.status })
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
    .select(
      `
      *,
      mission_members (
        *,
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
        location,
        location_type
      ),
      stories (
        id,
        title,
        status,
        published_at
      )
    `,
    )
    .eq("id", missionId)
    .single();

  if (error) throw new Error(error.message);

  // Sort updates: pinned first, then descending by date
  if (mission.mission_updates) {
    mission.mission_updates.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  // Sort members: leads first
  if (mission.mission_members) {
    mission.mission_members.sort((a, b) => {
      if (a.role === "lead" && b.role !== "lead") return -1;
      if (a.role !== "lead" && b.role === "lead") return 1;
      return 0;
    });
  }

  return mission;
};

export const postMissionUpdate = async ({
  data,
}: {
  data: { missionId: string; content: string };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const content = data.content.trim();
  if (!content) throw new Error("Update content is required");

  const { error, data: updateRow } = await supabase.rpc("post_my_mission_update", {
    _mission_id: data.missionId,
    _content: content,
    _client_request_id: crypto.randomUUID(),
  });

  if (error) throw new Error(error.message);

  return { ok: true, update: updateRow };
};
export const pinMissionUpdate = async (updateId: string, isPinned: boolean) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const { data: update, error: lookupError } = await supabase
    .from("mission_updates")
    .select("mission_id")
    .eq("id", updateId)
    .single();
  if (lookupError) throw new Error(lookupError.message);

  if (!(await canManageMission(userData.user.id, update.mission_id))) {
    throw new Error("Only mission leads or admins can pin updates");
  }

  const { error } = await supabase
    .from("mission_updates")
    .update({ is_pinned: isPinned })
    .eq("id", updateId);

  if (error) throw new Error(error.message);
  return { ok: true };
};
