export type ConversationContact = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  headline: string | null;
};

export type InboxContact = ConversationContact & {
  last_message_id: string | null;
  last_message_content: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
};

export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  client_request_id: string | null;
  created_at: string;
  read_at: string | null;
  /** Browser-only delivery evidence. Durable rows do not carry this field. */
  delivery_state?: "queued" | "sending" | "failed";
};
