import type { Database } from "@/integrations/supabase/types";
import { getConversationAccount } from "@/features/conversations/conversation-lifecycle";
import { boundedDirectMessageRequest } from "@/server/direct-message-request";

type EventRpcName =
  | "get_event_discussion"
  | "set_event_discussion"
  | "join_event_discussion"
  | "send_event_discussion_message"
  | "mark_event_discussion_read"
  | "list_my_community_chat_links"
  | "list_event_discussion_feed"
  | "event_discussion_safety_action";
type Functions = Database["public"]["Functions"];
/** The discriminant preserves the generated name/argument relationship through
 * dispatch. Unknown names and legacy argument shapes cannot cross this client. */
export type EventDiscussionRequest = {
  [Name in EventRpcName]: { name: Name } & (Functions[Name]["Args"] extends never
    ? { args?: never }
    : { args: Functions[Name]["Args"] });
}[EventRpcName];

export async function runEventDiscussionRequest<T>(
  request: EventDiscussionRequest,
  start: (signal: AbortSignal) => PromiseLike<T>,
  currentAccount = getConversationAccount,
  timeoutMs?: number,
): Promise<T> {
  const account = currentAccount();
  const assertCurrent = () => {
    const active = currentAccount();
    const expected =
      request.args && "_expected_user_id" in request.args
        ? request.args._expected_user_id
        : undefined;
    if (
      !account.owner ||
      active.owner !== account.owner ||
      active.generation !== account.generation ||
      (expected !== undefined && expected !== account.owner)
    ) {
      throw Object.assign(new Error("Your account changed. Reopen this discussion."), {
        code: "42501",
      });
    }
  };
  assertCurrent();
  try {
    const result = await boundedDirectMessageRequest((signal) => {
      assertCurrent();
      return start(signal);
    }, timeoutMs);
    assertCurrent();
    return result;
  } catch (cause) {
    // A stale completion must not be surfaced as the new account's outage.
    assertCurrent();
    throw cause;
  }
}
