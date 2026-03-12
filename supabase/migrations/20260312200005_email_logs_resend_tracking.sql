-- Add columns for Resend Pro delivery tracking

ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS resend_id text;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS details text;

CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON email_logs (resend_id) WHERE resend_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs (status, created_at DESC);
