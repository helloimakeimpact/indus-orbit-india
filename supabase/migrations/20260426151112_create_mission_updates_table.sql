CREATE TABLE mission_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE mission_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mission updates" ON mission_updates
  FOR SELECT USING (true);

CREATE POLICY "Mission members can post updates" ON mission_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM mission_members 
      WHERE mission_id = mission_updates.mission_id 
      AND user_id = auth.uid()
    )
  );

