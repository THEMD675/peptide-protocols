CREATE TABLE IF NOT EXISTS admin_user_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  note text NOT NULL,
  admin_email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON admin_user_notes
  USING (false)
  WITH CHECK (false);
