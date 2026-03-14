-- Fix anonymous INSERT permissions for contact form and newsletter
-- RLS policies exist but table-level GRANT is missing for anon role

-- Allow anon to INSERT into enquiries (contact form)
GRANT INSERT ON public.enquiries TO anon;

-- Allow anon to INSERT into email_list (newsletter signup)
GRANT INSERT ON public.email_list TO anon;

-- Verify the RLS policies exist (create if missing)
DO $$ BEGIN
  CREATE POLICY "Anon can submit enquiries"
    ON enquiries FOR INSERT TO anon
    WITH CHECK (user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anon can insert email_list"
    ON email_list FOR INSERT TO anon
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Also allow authenticated users to INSERT into enquiries
GRANT INSERT ON public.enquiries TO authenticated;

-- Ensure email_list rate limit trigger still works
-- (it checks 3/hour per email, which works regardless of role)
