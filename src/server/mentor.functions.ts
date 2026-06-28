import { supabase } from "@/integrations/supabase/client";
import { sendNotification } from "@/server/notification.functions";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const requestMentorSession = async ({
  data,
}: {
  data: { expertId: string; message: string; durationMins: number };
}) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");

  const userId = userData.user.id;
  if (data.expertId === userId) throw new Error("You cannot book a session with yourself.");

  const message = data.message.trim();
  if (message.length < 20) throw new Error("Please provide a bit more context (20+ chars).");
  if (![30, 60].includes(data.durationMins)) throw new Error("Choose a 30 or 60 minute session.");

  // Ensure the booker is verified
  const { data: bookerProfile, error: bookerError } = await supabase
    .from("profiles")
    .select("is_verified")
    .eq("user_id", userId)
    .maybeSingle();
  if (bookerError) throw new Error(bookerError.message);

  if (!bookerProfile?.is_verified) {
    throw new Error("Only verified members can book sessions. Please get verified first.");
  }

  const { error, data: session } = await supabase
    .from("mentor_sessions")
    .insert({
      expert_id: data.expertId,
      booker_id: userId,
      message,
      duration_mins: data.durationMins,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Notify the expert
  await sendNotification({
    userId: data.expertId,
    type: "mentor_request",
    message: "You have a new mentorship session request.",
    link: "/app/mentor",
  });

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

  const userId = userData.user.id;

  const { data: session, error: sessionError } = await supabase
    .from("mentor_sessions")
    .select("*")
    .eq("id", data.sessionId)
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message);
  if (!session) throw new Error("Session not found.");

  const isExpert = session.expert_id === userId;
  const isBooker = session.booker_id === userId;

  if (!isExpert && !isBooker) throw new Error("Unauthorized");

  // Only experts can accept/decline/complete. Booker can only cancel.
  if (!isExpert && ["accepted", "declined", "completed"].includes(data.status)) {
    throw new Error("Only the expert can perform this action.");
  }
  if (data.scheduledFor && Number.isNaN(new Date(data.scheduledFor).getTime())) {
    throw new Error("Choose a valid session time.");
  }

  const updatePayload: any = { status: data.status, updated_at: new Date().toISOString() };
  if (data.meetingUrl !== undefined) updatePayload.meeting_url = data.meetingUrl.trim() || null;
  if (data.scheduledFor !== undefined) updatePayload.scheduled_for = data.scheduledFor;

  const { error } = await supabase
    .from("mentor_sessions")
    .update(updatePayload)
    .eq("id", data.sessionId);

  if (error) throw new Error(error.message);

  // Notify the other party
  const notifyId = isExpert ? session.booker_id : session.expert_id;
  await sendNotification({
    userId: notifyId,
    type: "mentor_update",
    message: `Your mentorship session was marked as ${data.status}.`,
    link: "/app/mentor",
  });

  // If accepted and we are the expert, trigger the email dispatcher
  if (isExpert && data.status === "accepted") {
    // Get the mentor's name
    const { data: expertProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .single();
    const mentorName = expertProfile?.display_name || "A Mentor";
    const mentorNameHtml = escapeHtml(mentorName);
    const meetingUrl = data.meetingUrl?.trim();

    const htmlBody = `
      <h2>Mentorship Session Accepted</h2>
      <p><strong>${mentorNameHtml}</strong> has accepted your mentorship request.</p>
      ${data.scheduledFor ? `<p><strong>Scheduled for:</strong> ${new Date(data.scheduledFor).toLocaleString()}</p>` : ""}
      ${meetingUrl ? `<p><strong>Meeting Link:</strong> <a href="${escapeHtml(meetingUrl)}">${escapeHtml(meetingUrl)}</a></p>` : ""}
      <p>Log into Indus Orbit to view details or cancel the session.</p>
    `;

    await supabase.functions.invoke("resend-email-dispatcher", {
      body: {
        user_id: session.booker_id,
        category: "mentorship",
        subject: `Mentorship Accepted by ${mentorName}`,
        html_body: htmlBody,
      },
    });
  }

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
