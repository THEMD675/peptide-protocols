-- User protocols: tracks active peptide cycles
CREATE TABLE IF NOT EXISTS user_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peptide_id text NOT NULL,
  dose numeric NOT NULL,
  dose_unit text NOT NULL DEFAULT 'mcg',
  frequency text NOT NULL DEFAULT 'od',
  cycle_weeks integer NOT NULL DEFAULT 4,
  started_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_protocols_user ON user_protocols(user_id, status);

ALTER TABLE user_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own protocols"
  ON user_protocols FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own protocols"
  ON user_protocols FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own protocols"
  ON user_protocols FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own protocols"
  ON user_protocols FOR DELETE USING (auth.uid() = user_id);

-- Link injection logs to protocols
ALTER TABLE injection_logs ADD COLUMN IF NOT EXISTS protocol_id uuid REFERENCES user_protocols(id) ON DELETE SET NULL;

-- Lab results tracking
CREATE TABLE IF NOT EXISTS lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  tested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_user ON lab_results(user_id, test_id, tested_at DESC);

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own labs"
  ON lab_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own labs"
  ON lab_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own labs"
  ON lab_results FOR DELETE USING (auth.uid() = user_id);

-- Side effect logs
CREATE TABLE IF NOT EXISTS side_effect_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_id uuid REFERENCES user_protocols(id) ON DELETE SET NULL,
  symptom text NOT NULL,
  severity integer NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  logged_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_side_effects_user ON side_effect_logs(user_id, logged_at DESC);

ALTER TABLE side_effect_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own side effects"
  ON side_effect_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own side effects"
  ON side_effect_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own side effects"
  ON side_effect_logs FOR DELETE USING (auth.uid() = user_id);

-- User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  age integer,
  weight_kg numeric,
  gender text,
  goals text[],
  medical_conditions text,
  current_medications text,
  injection_preference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Wellness tracking
CREATE TABLE IF NOT EXISTS wellness_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  energy integer CHECK (energy BETWEEN 1 AND 5),
  sleep integer CHECK (sleep BETWEEN 1 AND 5),
  pain integer CHECK (pain BETWEEN 1 AND 5),
  mood integer CHECK (mood BETWEEN 1 AND 5),
  appetite integer CHECK (appetite BETWEEN 1 AND 5),
  weight_kg numeric,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wellness_user ON wellness_logs(user_id, logged_at DESC);

ALTER TABLE wellness_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wellness"
  ON wellness_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wellness"
  ON wellness_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own wellness"
  ON wellness_logs FOR DELETE USING (auth.uid() = user_id);
