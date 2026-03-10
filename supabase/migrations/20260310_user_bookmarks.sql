CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  peptide_slug text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, peptide_slug)
);

-- RLS
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookmarks" ON public.user_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON public.user_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id ON public.user_bookmarks(user_id);
