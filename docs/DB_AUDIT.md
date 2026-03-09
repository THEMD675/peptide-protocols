# Database Audit Report — pptides.com

**Date:** 2026-03-09  
**Project:** rxxzphwojutewvbfzgqd  
**Auditor:** Jarvis (automated)

---

## 1. Database Performance

### Table Sizes
All tables are tiny — largest is `blog_posts` at 160 kB. No performance concerns at current scale.

| Table | Size | Live Rows | Dead Rows |
|-------|------|-----------|-----------|
| blog_posts | 160 kB | 8 | 5 |
| subscriptions | 112 kB | 9 | 19 |
| ai_coach_requests | 72 kB | 21 | 27 |
| rate_limits | 64 kB | 34 | 5 |
| email_list | 48 kB | 1 | 1 |
| user_profiles | 48 kB | 4 | 0 |
| wellness_logs | 48 kB | 1 | 0 |
| user_protocols | 48 kB | 1 | 1 |
| injection_logs | 40 kB | 0 | 0 |
| referrals | 40 kB | 0 | 0 |
| All others | 16-32 kB | 0 | 0 |

**Total auth.users:** 58 (38 are test accounts — see Data Cleanup)

### Indexes — 60 total
All primary keys indexed. Good composite indexes on frequently queried patterns.

**Existing indexes (highlights):**
- `subscriptions`: user_id (unique), stripe_customer_id, stripe_subscription_id, referral_code
- `ai_coach_requests`: user_id, created_at, (user_id, created_at DESC)
- `injection_logs`: user_id, logged_at DESC, (user_id, logged_at DESC)
- `rate_limits`: (endpoint, ip_address, created_at), (endpoint, user_id, created_at)
- `blog_posts`: slug (unique), (is_published, published_at DESC)

### ✅ FIXED: Missing FK Indexes Added
These columns had no indexes — added during audit:
- `admin_audit_log.target_user_id` → `idx_admin_audit_log_target_user`
- `admin_user_notes.user_id` → `idx_admin_user_notes_user`
- `injection_logs.protocol_id` → `idx_injection_logs_protocol`
- `community_replies.user_id` → `idx_community_replies_user`
- `reviews.user_id` → `idx_reviews_user`
- `reports.target_id` → `idx_reports_target`
- `referrals.referred_user_id` → `idx_referrals_referred`
- `side_effect_logs.protocol_id` → `idx_side_effect_logs_protocol`
- `user_protocols.peptide_id` → `idx_user_protocols_peptide`

### Foreign Keys
Only 1 explicit FK: `community_replies.post_id → community_logs.id`  
All other `user_id` columns rely on RLS policies rather than FKs. This is standard for Supabase (auth.users is in a different schema).

### N+1 Query Check
**No N+1 queries found.** Searched all `.ts`/`.tsx` files for loops calling Supabase — none detected. Frontend uses proper batch queries.

---

## 2. Cron Jobs

### Before Audit
Only **1 cron job** existed:
- `expire-trials` — hourly (`0 * * * *`) — ✅ Working, last run succeeded

**Missing:**
- ❌ trial-reminder — NOT scheduled (edge function exists but no cron trigger)
- ❌ health-check — NOT scheduled (edge function exists but no cron trigger)
- ❌ No data cleanup jobs

### ✅ FIXED: Cron Jobs Added

| Job | Schedule | Purpose | Status |
|-----|----------|---------|--------|
| `expire-trials` | `0 * * * *` (hourly) | Expire trial subscriptions | ✅ Existed |
| `trial-reminder` | `0 8 * * *` (daily 8am UTC / 11am Riyadh) | Email trial users before expiry | ✅ **Added** |
| `health-check` | `*/30 * * * *` (every 30 min) | Check all services, alert on failure | ✅ **Added** |
| `cleanup-rate-limits` | `0 3 * * *` (daily 3am UTC) | Delete rate_limits entries >7 days old | ✅ **Added** |

**Note:** trial-reminder and health-check use `net.http_post` to call edge functions with the `CRON_SECRET` from `app.settings.cron_secret`. Ensure this setting is configured in Supabase dashboard → Database → Settings → Configuration parameters, or the calls will fail silently.

### Cron Job History
Only 1 run in history (expire-trials) — succeeded, 0 rows updated. Very limited history suggests pg_cron was recently enabled or history was cleared.

---

## 3. Database Maintenance

### VACUUM/ANALYZE Status
- **No manual VACUUM or ANALYZE** has ever run on any table
- **Autovacuum**: Only triggered once — on `ai_coach_requests` (autoanalyze on 2026-03-09)
- Tables are too small to trigger autovacuum thresholds (default: 50 dead tuples + 20% of live rows)
- `subscriptions` has 19 dead tuples vs 9 live — 211% dead ratio, but under absolute threshold
- **Verdict:** Not a concern at current scale. Autovacuum will handle it as data grows.

### Connection Pool Settings
- **max_connections:** 60 (Supabase free tier default)
- **statement_timeout:** 2 minutes (120,000ms) — reasonable
- **work_mem:** 3,500 kB — default, fine for current data sizes
- **maintenance_work_mem:** 64 MB — default

### ✅ FIXED: Idle Transaction Timeout
- **idle_in_transaction_session_timeout** was **0** (disabled!) — dangerous, can hold locks forever
- **Set to 5 minutes (300,000ms)** — prevents abandoned transactions from blocking

### Bloat Assessment
No bloated tables. Largest dead tuple ratio is `ai_coach_requests` (27 dead / 21 live) — trivial at 72 kB.

---

## 4. Monitoring Setup

### Health Check Edge Function — ✅ Comprehensive
Tests 7 things:
1. **Database** — queries subscriptions table
2. **Auth** — lists users via admin API
3. **Stripe** — retrieves balance
4. **Resend** — checks domains endpoint
5. **DeepSeek** — checks models endpoint
6. **Environment variables** — verifies 13 required vars
7. **Webhook activity** — recent processed_webhook_events

### Alerting — ✅ Built-in
- Sends email to `contact@pptides.com` on failure
- Rate-limited to max 1 alert per hour (checks `email_logs` table)
- Uses Resend API for delivery

### ✅ FIXED: Health Check Now Scheduled
Was: No cron trigger (function existed but was never called automatically)  
Now: Runs every 30 minutes via pg_cron

### External Uptime Monitoring
**Not configured.** No evidence of UptimeRobot, Pingdom, or similar.

**Recommendation:** Add an external uptime monitor (UptimeRobot free tier) for:
- `https://pptides.com` (frontend)
- `https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/health-check` (backend)

---

## 5. Data Cleanup

### Test Data — ⚠️ SIGNIFICANT
**38 out of 58 users (65.5%) are test accounts:**
- `e2etest@pptides.com`
- `flow-test-*@pptides.com`
- `test-audit@pptides.com`
- `e2etest-mar7@pptides.com`
- `test-final-*@pptides.com`
- `test-elite@pptides.com`
- `test@pptides.com`
- `test-v2b@pptides.com`
- `final-test-*@pptides.com`
- `journey-test@pptides.com`
- And ~28 more test accounts

**Action needed:** Clean up test users. These inflate metrics and may have associated subscription/profile data. Requires manual review before deletion (some may have Stripe test subscriptions).

### Orphaned Records
- **community_replies without parent post:** 0 ✅
- **subscriptions without auth.users:** 0 ✅

### Rate Limits
- **Total:** 34 entries (25 current, 9 old)
- **✅ FIXED:** Deleted 9 entries older than 7 days
- **✅ FIXED:** Added daily cleanup cron job

### Processed Webhook Events
- **0 entries** — either no webhooks have fired, or they're being cleaned. No action needed.

### Email Logs
- **0 entries** — either emails aren't being logged, or the table is unused. The health-check function does insert `health_alert` entries, so this will populate over time.

---

## 6. Realtime Configuration

### Current Status
**No tables have realtime enabled.** The `supabase_realtime` publication has 0 tables.

### Frontend Check
**No realtime usage found.** Grep for `supabase.channel` and `.on(` returned 0 results across all frontend code.

### Verdict
✅ **Correct configuration.** Realtime is not needed and is properly disabled. Saves resources.

---

## Summary of Changes Made

### Fixes Applied
1. ✅ Added 9 missing indexes on FK-like columns
2. ✅ Added `trial-reminder` cron job (daily 8am UTC)
3. ✅ Added `health-check` cron job (every 30 min)
4. ✅ Added `cleanup-rate-limits` cron job (daily 3am UTC)
5. ✅ Set `idle_in_transaction_session_timeout` to 5 minutes
6. ✅ Cleaned 9 stale rate_limits entries

### Recommendations (Manual Action Required)
1. **🔴 Clean test users** — 38/58 users are test accounts. Review and delete via Supabase dashboard.
2. **🟡 External uptime monitoring** — Add UptimeRobot or similar for pptides.com + health-check endpoint.
3. **🟡 Verify CRON_SECRET** — Ensure `app.settings.cron_secret` is set in DB config for the new cron jobs to authenticate.
4. **🟢 Consider adding FKs** — Most `user_id` columns lack foreign keys. Not urgent but improves data integrity as the app grows.
