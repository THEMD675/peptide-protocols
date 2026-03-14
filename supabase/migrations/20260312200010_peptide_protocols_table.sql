-- BATCH 11: Server-side content gating
-- Paid peptide protocol data stored in DB, only accessible to subscribed users
-- Free peptides remain fully client-side (isFree: true in peptides.ts)

CREATE TABLE IF NOT EXISTS peptide_protocols (
  id text PRIMARY KEY,
  dosage_ar text,
  timing_ar text,
  cycle_ar text,
  administration_ar text,
  side_effects_ar text,
  contraindications_ar text,
  stack_ar text,
  storage_ar text,
  mechanism_ar text,
  evidence_ar text,
  dose_mcg integer,
  dose_max_mcg integer,
  frequency text,
  cycle_duration_weeks integer,
  rest_period_weeks integer,
  route text,
  weekly_schedule jsonb,
  pubmed_ids text[],
  cost_estimate text,
  difficulty text,
  warning_ar text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE peptide_protocols ENABLE ROW LEVEL SECURITY;

-- No public read -- only service_role can read/write
CREATE POLICY "Service role only" ON peptide_protocols FOR ALL USING (false);

-- RPC to get a peptide protocol (checks subscription)
CREATE OR REPLACE FUNCTION get_peptide_protocol(p_peptide_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_status text;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT status INTO v_status
  FROM subscriptions
  WHERE user_id = v_user_id;

  IF v_status NOT IN ('active', 'trial') THEN
    RETURN NULL;
  END IF;

  SELECT to_jsonb(p) INTO v_result
  FROM peptide_protocols p
  WHERE p.id = p_peptide_id;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_peptide_protocol(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_peptide_protocol(text) TO authenticated;

COMMENT ON TABLE peptide_protocols IS 'Paid peptide protocol data. Only accessible via get_peptide_protocol RPC which checks subscription status.';
COMMENT ON FUNCTION get_peptide_protocol IS 'Returns full protocol data for a peptide if the user has an active/trial subscription. Returns NULL otherwise.';
