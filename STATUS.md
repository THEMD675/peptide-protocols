# pptides.com — Current Status

**Last updated:** 2026-03-02

**Build fix (2026-03-02):** web-vitals v5 removes `onFID` — use `onINP` only (INP replaced FID).

**Deploy (2026-03-02):** Frontend → Vercel (pptides.com). 14 edge functions → Supabase. DB push: up to date. CORS: OK.

---

## System State

| Component | Status |
|-----------|--------|
| **Frontend** | Vercel — https://pptides.com |
| **Build** | `npm run build` passes |
| **Pricing** | 34/371 SAR (Essentials/Elite) — `src/lib/constants.ts` |
| **Trial** | 3 days — `src/config/trial.ts` |
| **Edge functions** | 14 deployed — all use `_shared/cors.ts` (CORS + localhost) |
| **Service worker** | No auto skipWaiting — waits for user "Update" (prevents white screen) |
| **Admin** | `_shared/admin-auth.ts` + `admin-actions`, `admin-stats`, `send-enquiry-reply` |

---

## Edge Functions (14)

stripe-webhook, ai-coach, create-checkout, send-welcome-email, delete-account, cancel-subscription, health-check, admin-stats, trial-reminder, create-portal-session, inbound-email, admin-actions, send-enquiry-reply, **verify-stripe**

---

## Manual Steps (Credentials Required)

1. **Stripe verify** — Admin → Health tab → "Stripe" button (no CRON_SECRET needed).  
   Or: `STRIPE_SECRET_KEY=sk_xxx npm run verify-stripe` | `CRON_SECRET=xxx npm run verify-health`
2. **DEEPSEEK_API_KEY** — Supabase → Edge Functions → Secrets (Coach AI)
3. **E2E** — Signup → Checkout in incognito (email confirmation may apply)

---

## Docs

- **MANUAL_STEPS_RUNBOOK.md** — One-time setup (Stripe, DEEPSEEK, migrations, E2E)
- **FOUNDER_RUNBOOK.md** — Ops (refunds, deploy, logs)
- **SOURCE_OF_TRUTH.md** — Canonical config
- **AUDIT.md** — Master audit (832 items)
