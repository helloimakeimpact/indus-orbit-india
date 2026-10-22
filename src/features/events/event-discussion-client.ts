import { supabase } from "@/integrations/supabase/client";
import { isMissingSchemaContract } from "@/integrations/supabase/schema-compat";
import { parseEventDiscussion, parseCommunityChatLinks } from "./event-discussion-contract";
import { parseSpaceFeedPayload } from "@/features/spaces/space-feed";
import type { Json } from "@/integrations/supabase/types";
import type { DiscussionFeedPage, DiscussionPageQuery } from "./event-discussion-history";
import { runEventDiscussionRequest, type EventDiscussionRequest } from "./event-discussion-request";

type RpcResponse = { data: unknown; error: { message: string; code: string } | null };
function dispatch(request: EventDiscussionRequest, signal: AbortSignal): PromiseLike<RpcResponse> {
  // Each branch is checked against the replay-generated function signature.
  // The real PostgREST builder receives the timeout's AbortSignal.
  switch (request.name) {
    case "get_event_discussion":
      return supabase.rpc(request.name, request.args).abortSignal(signal);
    case "set_event_discussion":
      return supabase.rpc(request.name, request.args).abortSignal(signal);
    case "join_event_discussion":
      return supabase.rpc(request.name, request.args).abortSignal(signal);
    case "send_event_discussion_message":
      return supabase.rpc(request.name, request.args).abortSignal(signal);
    case "mark_event_discussion_read":
      return supabase.rpc(request.name, request.args).abortSignal(signal);
    case "list_my_community_chat_links":
      return supabase.rpc(request.name).abortSignal(signal);
    case "list_event_discussion_feed":
      return supabase.rpc(request.name, request.args).abortSignal(signal);
    case "event_discussion_safety_action":
      return supabase.rpc(request.name, request.args).abortSignal(signal);
  }
}
async function rpc(request: EventDiscussionRequest) {
  const result = await runEventDiscussionRequest(request, (signal) => dispatch(request, signal));
  if (result.error) {
    if (isMissingSchemaContract(result.error))
      throw new Error("Event discussion is getting ready. Please try again later.");
    throw Object.assign(new Error(result.error.message || "Couldn’t update this discussion."), {
      code: result.error.code,
    });
  }
  return result.data;
}
export async function getEventDiscussion(eventId: string) {
  return parseEventDiscussion(
    await rpc({ name: "get_event_discussion", args: { _event_id: eventId } }),
    eventId,
  );
}
export async function setEventDiscussion(
  eventId: string,
  enabled: boolean,
  version: number,
  userId: string,
) {
  return parseEventDiscussion(
    await rpc({
      name: "set_event_discussion",
      args: {
        _event_id: eventId,
        _enabled: enabled,
        _expected_version: version,
        _expected_user_id: userId,
      },
    }),
    eventId,
  );
}
export async function joinEventDiscussion(eventId: string, userId: string) {
  return parseEventDiscussion(
    await rpc({
      name: "join_event_discussion",
      args: { _event_id: eventId, _expected_user_id: userId },
    }),
    eventId,
  );
}
export async function sendEventDiscussionMessage(
  eventId: string,
  userId: string,
  content: string,
  requestId: string,
) {
  await rpc({
    name: "send_event_discussion_message",
    args: {
      _event_id: eventId,
      _expected_user_id: userId,
      _content: content,
      _client_request_id: requestId,
    },
  });
}
export async function markEventDiscussionRead(eventId: string, userId: string, messageId: string) {
  await rpc({
    name: "mark_event_discussion_read",
    args: {
      _event_id: eventId,
      _expected_user_id: userId,
      _message_id: messageId,
    },
  });
}
export async function getCommunityChatLinks() {
  return parseCommunityChatLinks(await rpc({ name: "list_my_community_chat_links" }));
}

export async function getEventDiscussionFeed(
  eventId: string,
  userId: string,
  query: DiscussionPageQuery,
): Promise<DiscussionFeedPage> {
  const data = await rpc({
    name: "list_event_discussion_feed",
    args: {
      _event_id: eventId,
      _expected_user_id: userId,
      _limit: query.limit,
      _before_created_at: query.cursor?.createdAt,
      _before_id: query.cursor?.id,
      _through_created_at: query.through?.createdAt,
      _through_id: query.through?.id,
    },
  });
  const root =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  if (!root || typeof root.newerAvailable !== "boolean")
    throw new Error("Invalid discussion history response.");
  const parsed = parseSpaceFeedPayload(data as Json);
  if (
    !Array.isArray(root.items) ||
    root.items.length !== parsed.items.length ||
    parsed.items.length > query.limit ||
    (parsed.hasMore && !parsed.nextCursor)
  )
    throw new Error("Invalid discussion history response.");
  return { ...parsed, newerAvailable: root.newerAvailable };
}

export async function eventDiscussionSafetyAction(
  eventId: string,
  userId: string,
  input: {
    messageId: string;
    action: "report" | "content_restrict" | "restore";
    category: string;
    reason: string;
    requestId: string;
  },
) {
  await rpc({
    name: "event_discussion_safety_action",
    args: {
      _event_id: eventId,
      _expected_user_id: userId,
      _message_id: input.messageId,
      _action: input.action,
      _category: input.category,
      _reason: input.reason,
      _client_request_id: input.requestId,
    },
  });
}
