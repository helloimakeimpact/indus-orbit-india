import { supabase } from "@/integrations/supabase/client";

export type RsvpStatus = "going" | "interested" | "not_going";

export const getEventRsvpState = async (eventId: string) => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const [{ data: counts }, mineRes] = await Promise.all([
    (supabase.rpc as any)("event_rsvp_counts", { _event_id: eventId }),
    userId
      ? (supabase.from as any)("event_rsvps")
          .select("status")
          .eq("event_id", eventId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    counts: (counts ?? { going: 0, interested: 0, not_going: 0 }) as Record<RsvpStatus, number>,
    mine: (mineRes?.data?.status ?? null) as RsvpStatus | null,
  };
};

export const setMyRsvp = async ({ data }: { data: { eventId: string; status: RsvpStatus } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in to RSVP");

  const { error } = await (supabase.from as any)("event_rsvps").upsert(
    {
      event_id: data.eventId,
      user_id: userData.user.id,
      status: data.status,
    },
    { onConflict: "event_id,user_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const clearMyRsvp = async ({ data }: { data: { eventId: string } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in to manage RSVP");
  const { error } = await (supabase.from as any)("event_rsvps")
    .delete()
    .eq("event_id", data.eventId)
    .eq("user_id", userData.user.id);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getEventAttendees = async (eventId: string) => {
  const { data, error } = await (supabase.from as any)("event_rsvps")
    .select("status, created_at, profiles!event_rsvps_user_id_fkey(user_id, display_name, headline, avatar_url)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};