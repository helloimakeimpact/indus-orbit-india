import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { isMissingSchemaContract } from "@/integrations/supabase/schema-compat";

export type EventInvitation = Database["public"]["Functions"]["discover_events"]["Returns"][number];
export type CommunitySummary =
  Database["public"]["Functions"]["discover_communities"]["Returns"][number];
export type EventGuest = Database["public"]["Functions"]["get_event_guest_list"]["Returns"][number];
export type RegistrationStatus = "confirmed" | "pending" | "waitlisted" | "cancelled" | "rejected";
export type Registration = {
  id: string | null;
  status: RegistrationStatus | null;
  checkedInAt: string | null;
  location: string | null;
  joinUrl: string | null;
  canManage: boolean;
};
function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) {
    if (isMissingSchemaContract(result.error))
      throw new Error("Events are getting ready. Please try again later.");
    throw new Error(
      (result.error as { message?: string }).message ??
        "We couldn’t complete that request. Try again.",
    );
  }
  return result.data;
}
export function decodeRegistration(value: Json | null): Registration {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Registration could not be confirmed.");
  const status = value.status;
  if (
    status !== null &&
    status !== "confirmed" &&
    status !== "pending" &&
    status !== "waitlisted" &&
    status !== "cancelled" &&
    status !== "rejected"
  )
    throw new Error("Registration could not be confirmed.");
  const text = (key: string) => (typeof value[key] === "string" ? (value[key] as string) : null);
  const url = text("joinUrl");
  return {
    id: text("id"),
    status,
    checkedInAt: text("checkedInAt"),
    location: text("location"),
    joinUrl: url?.startsWith("https://") ? url : null,
    canManage: value.canManage === true,
  };
}
export async function discoverEvents(
  filters: {
    eventId?: string;
    chapterId?: string;
    search?: string;
    period?: "upcoming" | "past" | "all";
    format?: "all" | "virtual" | "irl";
    offset?: number;
  } = {},
) {
  return (
    checked(
      await supabase.rpc("discover_events", {
        _event_id: filters.eventId,
        _chapter_id: filters.chapterId,
        _search: filters.search ?? "",
        _period: filters.period ?? "upcoming",
        _format: filters.format ?? "all",
        _offset: filters.offset ?? 0,
        _limit: 24,
      }),
    ) ?? []
  );
}
export async function discoverCommunities() {
  return checked(await supabase.rpc("discover_communities")) ?? [];
}
export async function getRegistration(eventId: string) {
  return decodeRegistration(
    checked(await supabase.rpc("get_my_event_registration", { _event_id: eventId })),
  );
}
export async function register(eventId: string, userId: string) {
  checked(
    await supabase.rpc("register_for_event", { _event_id: eventId, _expected_user_id: userId }),
  );
  return getRegistration(eventId);
}
export async function cancelRegistration(eventId: string, userId: string) {
  checked(
    await supabase.rpc("cancel_my_event_registration", {
      _event_id: eventId,
      _expected_user_id: userId,
    }),
  );
  return getRegistration(eventId);
}
export async function getGuests(eventId: string, page = 0) {
  return (
    checked(
      await supabase.rpc("get_event_guest_list", {
        _event_id: eventId,
        _offset: page * 100,
        _limit: 100,
      }),
    ) ?? []
  );
}
export async function manageGuest(
  eventId: string,
  registrationId: string,
  action: "approve" | "reject" | "check_in",
  userId: string,
) {
  checked(
    await supabase.rpc("manage_event_guest", {
      _event_id: eventId,
      _registration_id: registrationId,
      _action: action,
      _expected_user_id: userId,
    }),
  );
}
export async function cancelEvent(eventId: string, userId: string) {
  checked(
    await supabase.rpc("cancel_hosted_event", { _event_id: eventId, _expected_user_id: userId }),
  );
}
export type EventDraft = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  timezone: string;
  locationType: "virtual" | "irl";
  location: string;
  link: string;
  publicLocation: string;
  chapterId: string;
  coverTemplate: "dawn" | "lotus" | "banyan";
  visibility: "public" | "unlisted" | "members";
  registrationScope: "public" | "community" | "chapter";
  capacity: string;
  requiresApproval: boolean;
};
export async function submitEventDraft(draft: EventDraft, userId: string, clientRequestId: string) {
  const data = checked(
    await supabase.rpc("submit_my_event", {
      _input: {
        ...draft,
        expectedUserId: userId,
        clientRequestId,
        startTime: new Date(draft.startTime).toISOString(),
        endTime: new Date(draft.endTime).toISOString(),
      } as Json,
    }),
  );
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.id !== "string" ||
    (data.status !== "pending" && data.status !== "approved")
  )
    throw new Error("Event submission could not be confirmed.");
  return { id: data.id, status: data.status };
}
export type HostedEvent = {
  id: string;
  title: string;
  status: string;
  start_time: string;
  lifecycle?: string;
  organizer_id?: string;
  host_name?: string;
  description?: string;
  end_time?: string;
  timezone?: string;
  location_type?: string;
  public_location?: string;
  location?: string;
  join_url?: string;
};
export async function getEventWorkspace() {
  const data = checked(await supabase.rpc("get_my_event_workspace"));
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !Array.isArray(data.hosted) ||
    !Array.isArray(data.review)
  )
    throw new Error("Host workspace could not load.");
  const parse = (list: Json[]) =>
    list.map((value) => {
      if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        typeof value.id !== "string" ||
        typeof value.title !== "string" ||
        typeof value.status !== "string" ||
        typeof value.start_time !== "string"
      )
        throw new Error("Host workspace could not load.");
      return value as HostedEvent;
    });
  return {
    approvedHost: data.approvedHost === true,
    canReviewHosts: data.canReviewHosts === true,
    hosted: parse(data.hosted),
    review: parse(data.review),
  };
}
export async function reviewEvent(eventId: string, approved: boolean) {
  checked(
    await (approved
      ? supabase.rpc("lead_approve_event", { _event_id: eventId })
      : supabase.rpc("lead_reject_event", {
          _event_id: eventId,
          _reason: "Declined in event review workspace",
        })),
  );
}
export async function reviewHost(userId: string, approved: boolean, reason: string) {
  checked(
    await supabase.rpc("review_event_host", {
      _user_id: userId,
      _approved: approved,
      _reason: reason,
    }),
  );
}
