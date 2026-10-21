import { supabase } from "@/integrations/supabase/client";
import { isMissingSchemaContract } from "@/integrations/supabase/schema-compat";
import { parseEventDiscussion, parseCommunityChatLinks } from "./event-discussion-contract";
import { parseSpaceFeedPayload } from "@/features/spaces/space-feed";
import type { Json } from "@/integrations/supabase/types";
import type { DiscussionFeedPage, DiscussionPageQuery } from "./event-discussion-history";
import { getConversationAccount } from "@/features/conversations/conversation-lifecycle";
async function rpc(name: string, args: Record<string, unknown> = {}) {
  const account = getConversationAccount();
  const assertCurrent = () => {
    const active = getConversationAccount();
    if (
      !account.owner ||
      active.owner !== account.owner ||
      active.generation !== account.generation ||
      (args._expected_user_id && args._expected_user_id !== account.owner)
    ) {
      throw Object.assign(new Error("Your account changed. Reopen this discussion."), {
        code: "42501",
      });
    }
  };
  assertCurrent();
  const result = await supabase.rpc(name as never, args as never);
  assertCurrent();
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
  return parseEventDiscussion(await rpc("get_event_discussion", { _event_id: eventId }), eventId);
}
export async function setEventDiscussion(
  eventId: string,
  enabled: boolean,
  version: number,
  userId: string,
) {
  return parseEventDiscussion(
    await rpc("set_event_discussion", {
      _event_id: eventId,
      _enabled: enabled,
      _expected_version: version,
      _expected_user_id: userId,
    }),
    eventId,
  );
}
export async function joinEventDiscussion(eventId: string, userId: string) {
  return parseEventDiscussion(
    await rpc("join_event_discussion", { _event_id: eventId, _expected_user_id: userId }),
    eventId,
  );
}
export async function sendEventDiscussionMessage(
  eventId: string,
  userId: string,
  content: string,
  requestId: string,
) {
  await rpc("send_event_discussion_message", {
    _event_id: eventId,
    _expected_user_id: userId,
    _content: content,
    _client_request_id: requestId,
  });
}
export async function markEventDiscussionRead(eventId: string, userId: string, messageId: string) {
  await rpc("mark_event_discussion_read", {
    _event_id: eventId,
    _expected_user_id: userId,
    _message_id: messageId,
  });
}
export async function getCommunityChatLinks() {
  return parseCommunityChatLinks(await rpc("list_my_community_chat_links"));
}

export async function getEventDiscussionFeed(
  eventId: string,
  userId: string,
  query: DiscussionPageQuery,
): Promise<DiscussionFeedPage> {
  const data = await rpc("list_event_discussion_feed", {
    _event_id: eventId,
    _expected_user_id: userId,
    _limit: query.limit,
    _before_created_at: query.cursor?.createdAt ?? null,
    _before_id: query.cursor?.id ?? null,
    _through_created_at: query.through?.createdAt ?? null,
    _through_id: query.through?.id ?? null,
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
  await rpc("event_discussion_safety_action", {
    _event_id: eventId,
    _expected_user_id: userId,
    _message_id: input.messageId,
    _action: input.action,
    _category: input.category,
    _reason: input.reason,
    _client_request_id: input.requestId,
  });
}
