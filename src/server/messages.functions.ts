import { supabase } from "@/integrations/supabase/client";
import {
  boundedDirectMessageRequest,
  DIRECT_MESSAGE_SESSION_TIMEOUT_MS,
} from "./direct-message-request";
import {
  captureDirectMessageAccount,
  directMessagePage,
  parseConversationContacts,
  parseDirectInbox,
  parseDirectMessages,
  type ConversationContactsCursor,
  type DirectConversationCursor,
  type InboxCursor,
} from "./direct-message-contracts";

export type {
  ConversationContactsCursor,
  DirectConversationCursor,
  InboxCursor,
  DirectInboxContact,
} from "./direct-message-contracts";

function throwRpc(error: { message: string; code?: string } | null) {
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
}

async function account(expectedUserId: string | undefined, guard: () => void) {
  guard();
  // Auth getSession has no AbortSignal parameter in the installed SDK. Bound
  // our wait; generation guards still reject any obsolete late completion.
  const { data, error } = await boundedDirectMessageRequest(
    () => supabase.auth.getSession(),
    DIRECT_MESSAGE_SESSION_TIMEOUT_MS,
  );
  guard();
  if (
    error ||
    !data.session?.user.id ||
    (expectedUserId && data.session.user.id !== expectedUserId)
  ) {
    throw Object.assign(new Error("Your account changed. Reopen Messages."), { code: "42501" });
  }
  return data.session.user.id;
}

// This narrow cast is temporary until the local candidate types are regenerated.
// Every browser operation calls an expected-account RPC, without legacy fallback.
const rpc = (name: string, args: Record<string, unknown>, guard: () => void) => {
  guard();
  return boundedDirectMessageRequest((signal) => {
    guard();
    return supabase
      .rpc(name as never, args as never)
      .abortSignal(signal) as unknown as PromiseLike<{
      data: unknown;
      error: { message: string; code?: string } | null;
    }>;
  });
};

export async function getInbox(expectedUserId: string, before?: InboxCursor) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const call = (name: string, args: Record<string, unknown>) => rpc(name, args, guard);
  await account(expectedUserId, guard);
  const { data, error } = await call("list_my_direct_inbox_v2", {
    _expected_user_id: expectedUserId,
    _before_created_at: before?.createdAt,
    _before_id: before?.id,
    _before_peer_id: before?.peerId,
    _limit: 50,
  });
  throwRpc(error);
  await account(expectedUserId, guard);
  const rows = parseDirectInbox(data, expectedUserId);
  const contacts = rows.slice(0, 50);
  const boundary = contacts.at(-1);
  return {
    contacts,
    nextCursor:
      rows.length > 50 && boundary
        ? {
            createdAt: boundary.last_message_at,
            id: boundary.last_message_id,
            peerId: boundary.user_id,
          }
        : null,
  };
}

export async function listConversationContacts(
  expectedUserId: string,
  search = "",
  after?: ConversationContactsCursor,
) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const call = (name: string, args: Record<string, unknown>) => rpc(name, args, guard);
  await account(expectedUserId, guard);
  const { data, error } = await call("list_my_direct_contacts_v2", {
    _expected_user_id: expectedUserId,
    _search: search.trim(),
    _after_display_name: after?.displayName,
    _after_user_id: after?.userId,
    _limit: 50,
  });
  throwRpc(error);
  await account(expectedUserId, guard);
  const rows = parseConversationContacts(data, expectedUserId);
  const contacts = rows.slice(0, 50);
  const boundary = contacts.at(-1);
  return {
    contacts,
    nextCursor:
      rows.length > 50 && boundary
        ? { displayName: boundary.display_name ?? "Member", userId: boundary.user_id }
        : null,
  };
}

export async function getConnections(expectedUserId?: string) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const owner = await account(expectedUserId, guard);
  guard();
  const page = await listConversationContacts(owner);
  guard();
  return page.contacts;
}

export async function getConversationContact(expectedUserId: string, peerId: string) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const call = (name: string, args: Record<string, unknown>) => rpc(name, args, guard);
  await account(expectedUserId, guard);
  const { data, error } = await call("list_my_direct_contacts_v2", {
    _expected_user_id: expectedUserId,
    _only_user_id: peerId,
    _limit: 1,
  });
  throwRpc(error);
  await account(expectedUserId, guard);
  const contacts = parseConversationContacts(data, expectedUserId);
  if (contacts.some((contact) => contact.user_id !== peerId) || contacts.length > 1) {
    throw new Error("The selected connection could not be verified.");
  }
  return contacts[0] ?? null;
}

export async function getBlockedConnections(expectedUserId?: string) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const call = (name: string, args: Record<string, unknown>) => rpc(name, args, guard);
  const owner = await account(expectedUserId, guard);
  const { data, error } = await call("list_my_blocked_direct_contacts_v2", {
    _expected_user_id: owner,
  });
  throwRpc(error);
  await account(owner, guard);
  return parseConversationContacts(data, owner);
}

export async function blockMember(
  userId: string,
  reasonCategory = "member_choice",
  expectedUserId?: string,
) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const call = (name: string, args: Record<string, unknown>) => rpc(name, args, guard);
  const owner = await account(expectedUserId, guard);
  const { error } = await call("block_my_member_v2", {
    _expected_user_id: owner,
    _blocked_user_id: userId,
    _reason_category: reasonCategory,
  });
  throwRpc(error);
  await account(owner, guard);
}

export async function unblockMember(userId: string, expectedUserId?: string) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const call = (name: string, args: Record<string, unknown>) => rpc(name, args, guard);
  const owner = await account(expectedUserId, guard);
  const { error } = await call("unblock_my_member_v2", {
    _expected_user_id: owner,
    _blocked_user_id: userId,
  });
  throwRpc(error);
  await account(owner, guard);
}

export async function getConversation(
  otherUserId: string,
  before?: DirectConversationCursor,
  expectedUserId?: string,
) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const call = (name: string, args: Record<string, unknown>) => rpc(name, args, guard);
  const owner = await account(expectedUserId, guard);
  const { data, error } = await call("list_my_direct_conversation_v2", {
    _expected_user_id: owner,
    _other_user_id: otherUserId,
    _before_created_at: before?.createdAt,
    _before_id: before?.id,
    _limit: 50,
  });
  throwRpc(error);
  await account(owner, guard);
  return directMessagePage(parseDirectMessages(data, owner, otherUserId));
}

export async function getConversationAfter(
  otherUserId: string,
  after: DirectConversationCursor,
  expectedUserId: string,
) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const call = (name: string, args: Record<string, unknown>) => rpc(name, args, guard);
  await account(expectedUserId, guard);
  const { data, error } = await call("list_my_direct_conversation_after_v2", {
    _expected_user_id: expectedUserId,
    _other_user_id: otherUserId,
    _after_created_at: after.createdAt,
    _after_id: after.id,
    _limit: 50,
  });
  throwRpc(error);
  await account(expectedUserId, guard);
  return directMessagePage(parseDirectMessages(data, expectedUserId, otherUserId));
}

export async function sendMessage(
  recipientId: string,
  content: string,
  clientRequestId: string = crypto.randomUUID(),
  expectedUserId?: string,
) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const call = (name: string, args: Record<string, unknown>) => rpc(name, args, guard);
  const owner = await account(expectedUserId, guard);
  if (recipientId === owner) throw new Error("You cannot message yourself.");
  const message = content.trim();
  if (!message) throw new Error("Message cannot be empty.");
  if (message.length > 4_000) throw new Error("Messages cannot exceed 4,000 characters.");
  const { data, error } = await call("send_my_direct_message_v2", {
    _expected_user_id: owner,
    _recipient_id: recipientId,
    _content: message,
    _client_request_id: clientRequestId,
  });
  throwRpc(error);
  await account(owner, guard);
  const rows = parseDirectMessages(Array.isArray(data) ? data : [data], owner, recipientId);
  if (
    rows.length !== 1 ||
    rows[0].client_request_id !== clientRequestId ||
    rows[0].content !== message
  ) {
    throw new Error("The sent message could not be verified. Retry the original message.");
  }
  return rows[0];
}

export async function markConversationRead(
  otherUserId: string,
  boundaryId: string,
  expectedUserId: string,
) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const call = (name: string, args: Record<string, unknown>) => rpc(name, args, guard);
  await account(expectedUserId, guard);
  const { error } = await call("mark_my_direct_conversation_read_v2", {
    _expected_user_id: expectedUserId,
    _other_user_id: otherUserId,
    _through_id: boundaryId,
  });
  throwRpc(error);
  await account(expectedUserId, guard);
}

export async function getUnreadMessageCount(expectedUserId?: string) {
  const guard = captureDirectMessageAccount(expectedUserId);
  const owner = await account(expectedUserId, guard);
  guard();
  const { count, error } = await boundedDirectMessageRequest((signal) => {
    guard();
    return supabase
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", owner)
      .is("read_at", null)
      .abortSignal(signal);
  });
  throwRpc(error);
  await account(owner, guard);
  return count ?? 0;
}
