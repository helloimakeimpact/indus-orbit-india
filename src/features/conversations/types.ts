export type ConversationContact = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  headline: string | null;
};

export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};
