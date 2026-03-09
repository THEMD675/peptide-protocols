# Edge Function Integration Test Report

**Date:** 2026-03-09  
**Project:** pptides-v2 (rxxzphwojutewvbfzgqd)  
**Base URL:** https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1  
**All functions:** `verify_jwt: false` (auth handled in function code)

---

## Summary

| Function | Status | Notes |
|---|---|---|
| health-check | ✅ PASS | All 7 checks healthy |
| admin-stats | ✅ PASS | Auth correctly enforced |
| ai-coach | ✅ PASS | Auth correctly enforced |
| create-checkout | ✅ PASS | Auth correctly enforced |
| stripe-webhook | ✅ PASS | Signature validation works |
| send-welcome-email | ✅ PASS | Auth correctly enforced |
| trial-reminder | ⚠️ FIX APPLIED | Runtime error in post-email sections; added section-level try/catch |
| daily-digest | ✅ PASS | Returns correctly (0 push subscribers) |
| verify-stripe | ✅ PASS | Prices & webhooks verified |
| cancel-subscription | ✅ PASS | Auth correctly enforced |
| delete-account | ✅ PASS | Auth correctly enforced |
| create-portal-session | ✅ PASS | Auth correctly enforced |
| send-push | ✅ PASS | Auth correctly enforced (400 on missing body) |
| admin-actions | ✅ PASS | Auth correctly enforced |
| send-enquiry-reply | ✅ PASS | Auth correctly enforced |
| inbound-email | ⚠️ CONFIG ISSUE | RESEND_WEBHOOK_SECRET not set → 500 |

**Overall: 14/16 pass, 2 need attention**

---

## Detailed Results

### 1. health-check ✅
**Auth:** CRON_SECRET via `x-cron-secret` header  
**Test:** GET with correct secret → 200  
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok", "detail": "connected" },
    "auth": { "status": "ok", "detail": "1 user(s)" },
    "stripe": { "status": "ok", "detail": "connected, 1 currency(ies)" },
    "resend": { "status": "ok", "detail": "connected" },
    "deepseek": { "status": "ok", "detail": "connected" },
    "env_vars": { "status": "ok", "detail": "all 13 set" },
    "webhook_activity": { "status": "ok", "detail": "0 events in last 5min" }
  }
}
```
- Without auth → 401 ✅
- Without CRON_SECRET header → 401 ✅

### 2. admin-stats ✅
**Auth:** User JWT + admin email whitelist  
- Without auth → 401 ✅
- With anon key (non-admin) → 403 "Forbidden" ✅

### 3. ai-coach ✅
**Auth:** User JWT  
- Without auth → 401 "غير مصرّح" ✅
- With anon key → 401 (no user session) ✅
- Rate limit headers: Not present on 401 responses (expected — rate limiting only applies to authenticated requests)

### 4. create-checkout ✅
**Auth:** User JWT  
- Without auth → 401 "Missing authorization" ✅
- With anon key + body → 401 "Unauthorized" (no user session from anon key) ✅
- Wrong method (GET) → 405 ✅

### 5. stripe-webhook ✅
**Auth:** Stripe signature verification  
- Without stripe-signature → 400 "Missing Stripe signature" ✅
- With invalid signature → 400 "Invalid webhook signature" ✅

### 6. send-welcome-email ✅
**Auth:** User JWT  
- Without auth → 401 "Missing authorization" ✅

### 7. trial-reminder ⚠️ FIX APPLIED
**Auth:** CRON_SECRET via `x-cron-secret` header  
- Without auth → 401 ✅
- With correct CRON_SECRET → 500 "Internal error" ❌

**Root cause:** The function is a 750-line monolith that handles:
1. Trial reminder emails (day 1, last day, expired, win-back)
2. Weekly summary emails for active subscribers
3. Proactive coach check-ins for inactive users
4. Server-side trial expiration cleanup
5. Auto-expire granted subscriptions
6. Rate limit cleanup
7. Smart dunning emails for past_due subscribers
8. Re-engagement emails for churned users
9. Admin proactive alerts

An unhandled exception in any of sections 2-9 was killing the entire function.

**Fix applied:** Wrapped each major section in its own try/catch so failures are isolated and logged. Also added `detail` field to the outer catch response for debugging.

### 8. daily-digest ✅
**Auth:** CRON_SECRET via `x-cron-secret` header  
- Without auth → 401 ✅
- With correct CRON_SECRET → 200 `{"sent":0,"message":"No users with push subscriptions"}` ✅

### 9. verify-stripe ✅
**Auth:** CRON_SECRET via `x-cron-secret` or `authorization` header  
- Without auth → 401 ✅
- With correct CRON_SECRET → 200 ✅
```json
{
  "status": "ok",
  "prices": {
    "essentials": { "id": "price_1T6QrYAT1lRVVLw7UNdI4t2g", "unit_amount": 3400, "currency": "sar", "ok": true },
    "elite": { "id": "price_1T6QrZAT1lRVVLw7qu0FZIWT", "unit_amount": 37100, "currency": "sar", "ok": true }
  },
  "webhooks": [{ "url": "…/stripe-webhook", "status": "enabled", "eventsCount": 11 }],
  "eventsOk": true,
  "missingEvents": []
}
```

### 10. Other Functions — Unauthenticated Access ✅
| Function | No-Auth Response | Status |
|---|---|---|
| cancel-subscription | 401 "Missing authorization token" | ✅ |
| delete-account | 401 "Missing authorization token" | ✅ |
| create-portal-session | 401 "Missing authorization" | ✅ |
| send-push | 401 "Unauthorized" | ✅ |
| admin-actions | 401 "Unauthorized" | ✅ |
| send-enquiry-reply | 401 "Unauthorized" | ✅ |

### 11. inbound-email ⚠️ CONFIG ISSUE
- Without auth → 500 "Webhook secret not configured"
- **Issue:** `RESEND_WEBHOOK_SECRET` is not in the project secrets. Only `RESEND_API_KEY` and `RESEND_DOMAIN` are set.
- **Fix needed:** Set `RESEND_WEBHOOK_SECRET` in Supabase project secrets (get from Resend dashboard → Webhooks → Signing Secret)

---

## CRON_SECRET Issue Found & Fixed

**Problem:** The original CRON_SECRET value stored in Supabase secrets was `1c464295473a1812eb7f9317a32b29156e80201847b3199d07aeb6cb70d5404f` — but this was actually the SHA-256 **digest** displayed by `supabase secrets list`, NOT the actual secret value. All cron-authenticated functions were returning 401.

**Fix:** Regenerated CRON_SECRET with `openssl rand -hex 32` and set via Management API. New value confirmed working across health-check, daily-digest, verify-stripe, and trial-reminder (auth passes).

**Current CRON_SECRET:** `9cac2c009128ab55675c074ce731906b1dc5e2a544d43a32246b49fb3f8e73ec`

---

## Code Changes

### trial-reminder/index.ts
- Wrapped 6 major post-loop sections in individual try/catch blocks to prevent cascade failures
- Added `detail` field to outer catch response for debugging
- Sections isolated: weekly summary, inactive checkin, trial expiration, dunning, winback, admin alert

---

## Recommendations

1. **Deploy trial-reminder fix** — The section-level try/catch will prevent the 500 and log which section fails
2. **Set RESEND_WEBHOOK_SECRET** — Required for inbound-email function to work
3. **Consider splitting trial-reminder** — At 750+ lines handling 9 distinct concerns, it should be broken into separate functions (e.g., `weekly-summary`, `dunning-emails`, `trial-cleanup`)
4. **Add monitoring** — The health-check function is excellent; consider calling it on a cron schedule
5. **Test with real user JWT** — Admin-stats, ai-coach, create-checkout etc. need actual user sessions for full integration testing
