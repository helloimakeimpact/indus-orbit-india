import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type RsvpStatus = "going" | "interested" | "not_going";
type RsvpCounts = Record<RsvpStatus, number>;

const emptyRsvpCounts: RsvpCounts = { going: 0, interested: 0, not_going: 0 };

function toRsvpStatus(value: string | null | undefined): RsvpStatus | null {
  return value === "going" || value === "interested" || value === "not_going" ? value : null;
}

function toRsvpCounts(value: Json | null): RsvpCounts {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return emptyRsvpCounts;

  return {
    going: typeof value.going === "number" ? value.going : 0,
    interested: typeof value.interested === "number" ? value.interested : 0,
    not_going: typeof value.not_going === "number" ? value.not_going : 0,
  };
}

export const getEventRsvpState = async (eventId: string) => {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const [countsRes, mineRes] = await Promise.all([
    supabase.rpc("event_rsvp_counts", { _event_id: eventId }),
    userId
      ? supabase
          .from("event_rsvps")
          .select("status")
          .eq("event_id", eventId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (countsRes.error) throw new Error(countsRes.error.message);
  if (mineRes?.error) throw new Error(mineRes.error.message);

  return {
    counts: toRsvpCounts(countsRes.data),
    mine: toRsvpStatus(mineRes?.data?.status),
  };
};

export const setMyRsvp = async ({ data }: { data: { eventId: string; status: RsvpStatus } }) => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in to RSVP");

  const { error } = await supabase.from("event_rsvps").upsert(
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
  const { error } = await supabase
    .from("event_rsvps")
    .delete()
    .eq("event_id", data.eventId)
    .eq("user_id", userData.user.id);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getEventAttendees = async (eventId: string) => {
  const { data: rsvps, error } = await supabase
    .from("event_rsvps")
    .select("status, created_at, user_id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const list = (rsvps ?? []).map((rsvp) => ({
    ...rsvp,
    status: toRsvpStatus(rsvp.status),
  }));
  if (list.length === 0) return [];
  const ids = Array.from(new Set(list.map((r) => r.user_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, display_name, headline, avatar_url")
    .in("user_id", ids);
  if (profilesError) throw new Error(profilesError.message);
  const byId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  return list.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
};
