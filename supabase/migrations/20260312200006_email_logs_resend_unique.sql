-- Add unique constraint on resend_id so upserts work correctly
-- Add details column if not present (for bounce/complaint data)

ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS details text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_resend_id_unique
  ON email_logs (resend_id) WHERE resend_id IS NOT NULL;
