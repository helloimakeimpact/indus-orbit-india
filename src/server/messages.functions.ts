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

  const otherIds = (data ?? []).map((r) => (r.sender_id === userId ? r.recipient_id : r.sender_id));
  if (!otherIds.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url, headline")
    .in("user_id", otherIds);
  if (profilesError) throw new Error(profilesError.message);

  return profiles ?? [];
}

// Get all messages in a conversation between current user and another user
export async function getConversation(otherUserId: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Unauthorized");
  const userId = userData.user.id;

  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`,
    )
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
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
