CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NULL
);

-- Index for fast conversation fetching
CREATE INDEX direct_messages_sender_idx ON direct_messages(sender_id);
CREATE INDEX direct_messages_recipient_idx ON direct_messages(recipient_id);
CREATE INDEX direct_messages_created_at_idx ON direct_messages(created_at);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see messages they sent or received
CREATE POLICY "Users can view own messages" ON direct_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can only send messages (insert as sender)
CREATE POLICY "Users can send messages" ON direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can only mark their own received messages as read
CREATE POLICY "Recipients can mark read" ON direct_messages
  FOR UPDATE USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Enable Realtime on the table
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

