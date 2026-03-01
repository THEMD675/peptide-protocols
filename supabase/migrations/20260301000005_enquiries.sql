-- Peptide enquiries from logged-in users
CREATE TABLE IF NOT EXISTS enquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text,
  subject text NOT NULL DEFAULT 'استفسار عام',
  peptide_name text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'closed')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  replied_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_enquiries_user ON enquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);

ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

-- Users can insert their own enquiries
DO $$ BEGIN
  CREATE POLICY "Users can insert own enquiries" ON enquiries
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can read their own enquiries
DO $$ BEGIN
  CREATE POLICY "Users can read own enquiries" ON enquiries
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
