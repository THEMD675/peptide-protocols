-- AI14: Coach feedback table for thumbs up/down on AI responses
CREATE TABLE IF NOT EXISTS public.coach_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid,
  message_index int NOT NULL,
  rating text CHECK (rating IN ('up', 'down')) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.coach_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON public.coach_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback" ON public.coach_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_coach_feedback_user ON public.coach_feedback (user_id, created_at DESC);
