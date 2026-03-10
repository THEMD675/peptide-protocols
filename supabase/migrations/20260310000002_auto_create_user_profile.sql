-- Fix: Auto-create user_profiles row on signup (alongside subscription row)
-- Without this, user_profiles is never populated until the browser client calls
-- upsert on first login. The ai-coach queries user_profiles for goals/weight/wellness
-- context — missing rows mean no personalization on first session.
--
-- Also backfills existing users who have subscriptions but no user_profiles row.

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Backfill: create user_profiles for existing users who don't have one
INSERT INTO public.user_profiles (user_id, created_at, updated_at)
SELECT s.user_id, NOW(), NOW()
FROM public.subscriptions s
LEFT JOIN public.user_profiles up ON up.user_id = s.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
