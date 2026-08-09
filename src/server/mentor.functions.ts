import { supabase } from "@/integrations/supabase/client";

export const requestMentorSession = async ({
  data,
}: {
  data: { expertId: string; message: string; durationMins: number };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  if (data.expertId === userData.user.id)
    throw new Error("You cannot book a session with yourself.");

  const message = data.message.trim();
  if (message.length < 20) throw new Error("Please provide a bit more context (20+ chars).");
  if (![30, 60].includes(data.durationMins)) throw new Error("Choose a 30 or 60 minute session.");

  const { error, data: session } = await supabase.rpc("request_my_mentor_session", {
    _expert_id: data.expertId,
    _message: message,
    _duration_mins: data.durationMins,
    _client_request_id: crypto.randomUUID(),
  });

  if (error) throw new Error(error.message);

  return { ok: true, sessionId: session.id };
};

export const updateMentorSession = async ({
  data,
}: {
  data: {
    sessionId: string;
    status: "accepted" | "declined" | "completed" | "cancelled";
    meetingUrl?: string;
    scheduledFor?: string;
  };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  if (data.scheduledFor && Number.isNaN(new Date(data.scheduledFor).getTime())) {
    throw new Error("Choose a valid session time.");
  }

  const { error } = await supabase.rpc("transition_my_mentor_session", {
    _session_id: data.sessionId,
    _status: data.status,
    _meeting_url: data.meetingUrl?.trim() || undefined,
    _scheduled_for: data.scheduledFor,
  });

  if (error) throw new Error(error.message);

  return { ok: true };
};

export const getMyMentorSessions = async () => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const userId = userData.user.id;

  // Sessions where I am the expert
  const { data: expertSessions, error: expertError } = await supabase
    .from("mentor_sessions")
    .select(
      "*, profiles!mentor_sessions_booker_id_fkey(display_name, avatar_url, headline, orbit_segment)",
    )
    .eq("expert_id", userId)
    .order("created_at", { ascending: false });
  if (expertError) throw new Error(expertError.message);

  // Sessions where I am the booker
  const { data: bookedSessions, error: bookedError } = await supabase
    .from("mentor_sessions")
    .select(
      "*, profiles!mentor_sessions_expert_id_fkey(display_name, avatar_url, headline, orbit_segment)",
    )
    .eq("booker_id", userId)
    .order("created_at", { ascending: false });
  if (bookedError) throw new Error(bookedError.message);

  // Calculate hours delivered this month
  let hoursDelivered = 0;
  if (expertSessions) {
    const now = new Date();
    expertSessions.forEach((s) => {
      if (s.status === "completed" && s.updated_at) {
        const d = new Date(s.updated_at);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          hoursDelivered += s.duration_mins / 60;
        }
      }
    });
  }

  return {
    asExpert: expertSessions ?? [],
    asBooker: bookedSessions ?? [],
    monthlyHoursDelivered: hoursDelivered,
  };
};
