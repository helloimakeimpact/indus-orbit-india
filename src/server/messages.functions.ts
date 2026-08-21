import { supabase } from "@/integrations/supabase/client";

// Get all connections (accepted) so we know who you can message
export async function getConnections() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  const userId = userData.user.id;

  const { data, error } = await supabase
    .from("connection_requests")
    .select("sender_id, recipient_id")
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);

  if (error) throw new Error(error.message);

  const { data: blockRows, error: blockError } = await supabase
    .from("member_blocks")
    .select("blocked_user_id");
  if (blockError) throw new Error(blockError.message);
  const blockedIds = new Set((blockRows ?? []).map((row) => row.blocked_user_id));

  const otherIds = (data ?? [])
    .map((r) => (r.sender_id === userId ? r.recipient_id : r.sender_id))
    .filter((id) => !blockedIds.has(id));
  if (!otherIds.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url, headline")
    .in("user_id", otherIds);
  if (profilesError) throw new Error(profilesError.message);

  return profiles ?? [];
}

export async function getBlockedConnections() {
  const { data: blockRows, error: blockError } = await supabase
    .from("member_blocks")
    .select("blocked_user_id")
    .order("created_at", { ascending: false });
  if (blockError) throw new Error(blockError.message);
  const ids = (blockRows ?? []).map((row) => row.blocked_user_id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url, headline")
    .in("user_id", ids);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function blockMember(userId: string, reasonCategory = "member_choice") {
  const { error } = await supabase.rpc("block_my_member", {
    _blocked_user_id: userId,
    _reason_category: reasonCategory,
  });
  if (error) throw new Error(error.message);
}

export async function unblockMember(userId: string) {
  const { error } = await supabase.rpc("unblock_my_member", {
    _blocked_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

export type DirectConversationCursor = { createdAt: string; id: string };

const conversationPageSize = 50;

// Fetch a bounded caller-owned page. The RPC returns one look-ahead row so the
// browser can offer an earlier page without a count or OFFSET scan.
export async function getConversation(otherUserId: string, before?: DirectConversationCursor) {
  const { data, error } = await supabase.rpc("list_my_direct_conversation", {
    _other_user_id: otherUserId,
    _before_created_at: before?.createdAt,
    _before_id: before?.id,
    _limit: conversationPageSize,
  });
  if (error) throw new Error(error.message);
  const page = (data ?? []).slice(0, conversationPageSize).map((message) => ({
    id: message.message_id,
    sender_id: message.sender_id,
    recipient_id: message.recipient_id,
    content: message.content,
    client_request_id: message.client_request_id,
    created_at: message.created_at,
    read_at: message.read_at,
  }));
  const oldest = page.at(-1);
  return {
    messages: page,
    nextCursor:
      data && data.length > conversationPageSize && oldest
        ? { createdAt: oldest.created_at, id: oldest.id }
        : null,
  };
}

// Send a message
export async function sendMessage(recipientId: string, content: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  const userId = userData.user.id;

  if (recipientId === userId) throw new Error("You cannot message yourself.");
  const message = content.trim();
  if (!message) throw new Error("Message cannot be empty.");
  if (message.length > 4000) throw new Error("Messages cannot exceed 4,000 characters.");

  const { data: msg, error } = await supabase
    .rpc("send_my_direct_message", {
      _recipient_id: recipientId,
      _content: message,
      _client_request_id: crypto.randomUUID(),
    })
    .single();

  if (error) throw new Error(error.message);
  return msg;
}

// Mark all messages from a specific sender as read
export async function markConversationRead(otherUserId: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { error } = await supabase.rpc("mark_my_direct_conversation_read", {
    _other_user_id: otherUserId,
  });

  if (error) throw new Error(error.message);
}

// Get unread message count
export async function getUnreadMessageCount() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return 0;
  const userId = userData.user.id;

  const { count, error } = await supabase
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
