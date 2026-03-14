CREATE TABLE IF NOT EXISTS saved_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  peptides text[] DEFAULT '{}',
  protocol_text text NOT NULL,
  source_conversation_id uuid REFERENCES coach_conversations(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE saved_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own protocols" ON saved_protocols FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own protocols" ON saved_protocols FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own protocols" ON saved_protocols FOR DELETE USING (auth.uid() = user_id);
