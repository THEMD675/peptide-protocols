-- Enable RLS on tables that are missing it
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_list ENABLE ROW LEVEL SECURITY;

-- subscriptions: policies already exist (select own, update own)
-- Need service_role insert for the trigger
DO $$ BEGIN
  CREATE POLICY "service_role_insert_subscriptions" ON public.subscriptions
    FOR INSERT TO service_role
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Also allow authenticated users to insert their own (for edge cases)
DO $$ BEGIN
  CREATE POLICY "Users can insert own subscription" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- injection_logs: need full CRUD for own rows
DO $$ BEGIN
  CREATE POLICY "Users can read own injection logs" ON public.injection_logs
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own injection logs" ON public.injection_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own injection logs" ON public.injection_logs
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own injection logs" ON public.injection_logs
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- reviews: public read for approved, auth insert
-- Policy "Anyone can read approved reviews" already exists on reviews
DO $$ BEGIN
  CREATE POLICY "Users can insert own reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- community_logs: public read, auth insert
DO $$ BEGIN
  CREATE POLICY "Anyone can read community logs" ON public.community_logs
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own community logs" ON public.community_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own community logs" ON public.community_logs
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own community logs" ON public.community_logs
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- email_list: service role only (no anon/auth access)
DO $$ BEGIN
  CREATE POLICY "service_role_only_email_list" ON public.email_list
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Also allow authenticated insert for newsletter signup
DO $$ BEGIN
  CREATE POLICY "Anyone can insert email" ON public.email_list
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
