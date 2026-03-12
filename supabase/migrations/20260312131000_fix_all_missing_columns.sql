-- Fix ALL column mismatches between code and DB
-- Found by testing every .select() query against live DB

-- injection_logs: code expects 'unit', table might be empty
ALTER TABLE injection_logs ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE injection_logs ADD COLUMN IF NOT EXISTS dose text;
ALTER TABLE injection_logs ADD COLUMN IF NOT EXISTS site text;
ALTER TABLE injection_logs ADD COLUMN IF NOT EXISTS peptide_name text;
ALTER TABLE injection_logs ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE injection_logs ADD COLUMN IF NOT EXISTS logged_at timestamptz DEFAULT now();

-- wellness_logs: code expects 'date', table has different column names
-- DB has: energy, sleep, pain, mood, appetite, notes, logged_at, weight_kg
-- Code expects: date, sleep_quality, energy_level, mood, pain_level, notes
ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS date date;
ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS sleep_quality integer;
ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS energy_level integer;
ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS pain_level integer;

-- side_effect_logs: code expects peptide_name, symptom, severity, logged_at
ALTER TABLE side_effect_logs ADD COLUMN IF NOT EXISTS peptide_name text;
ALTER TABLE side_effect_logs ADD COLUMN IF NOT EXISTS symptom text;
ALTER TABLE side_effect_logs ADD COLUMN IF NOT EXISTS severity text;
ALTER TABLE side_effect_logs ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE side_effect_logs ADD COLUMN IF NOT EXISTS logged_at timestamptz DEFAULT now();

-- community_logs: code expects 'likes', DB has 'upvotes' and 'display_name'
ALTER TABLE community_logs ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0;
ALTER TABLE community_logs ADD COLUMN IF NOT EXISTS display_name text;

-- notifications: code expects title, body, read
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type text;

-- coach_conversations: code expects created_at
ALTER TABLE coach_conversations ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- user_bookmarks: code expects peptide_id
ALTER TABLE user_bookmarks ADD COLUMN IF NOT EXISTS peptide_id text;

-- user_protocols: code expects peptide_name, dose, unit, frequency, etc.
ALTER TABLE user_protocols ADD COLUMN IF NOT EXISTS peptide_name text;
ALTER TABLE user_protocols ADD COLUMN IF NOT EXISTS dose text;
ALTER TABLE user_protocols ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE user_protocols ADD COLUMN IF NOT EXISTS frequency text;
ALTER TABLE user_protocols ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE user_protocols ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE user_protocols ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE user_protocols ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
