-- Add missing indexes on admin_audit_log for common query patterns

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_email
  ON admin_audit_log (admin_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user
  ON admin_audit_log (target_user_id)
  WHERE target_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
  ON admin_audit_log (action, created_at DESC);
