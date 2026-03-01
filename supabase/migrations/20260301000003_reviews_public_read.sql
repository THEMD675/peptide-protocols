-- Allow anyone to read approved reviews (for public reviews page and landing testimonials)
DO $$ BEGIN
  CREATE POLICY "Anyone can read approved reviews" ON reviews
    FOR SELECT USING (is_approved = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
