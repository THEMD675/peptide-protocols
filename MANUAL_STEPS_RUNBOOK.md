# pptides — Manual Steps Runbook

**Execute these steps to complete production readiness. No automation can do them without your credentials/dashboard access.**

**See [docs/SECRETS_INVENTORY.md](docs/SECRETS_INVENTORY.md) for a full list of secrets and where to find them.**

---

## 1. DEEPSEEK_API_KEY (Coach AI)

Coach returns 500 until this is set. **Required for ai-coach edge function.**

### Steps (Supabase Dashboard)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → select project `hexnuldwerzwbljorokw`
2. **Edge Functions** (left sidebar) → **Secrets**
3. Click **Add new secret**
4. Name: `DEEPSEEK_API_KEY`
5. Value: Your DeepSeek API key from [platform.deepseek.com](https://platform.deepseek.com)
6. Save

### Verify

- Visit https://pptides.com/coach
- Log in with a trial/paid account
- Send a message — if you get a response, it works. If 500, check Supabase Edge Function logs for ai-coach.

---

## 2. Vercel Production Commit (Verify Deployed Source)

**Why:** Live site shows SAR; git HEAD a638ef2 has USD. We must know what Vercel actually deploys.

### Steps

1. Go to [Vercel Dashboard](https://vercel.com) → select pptides.com project
2. **Deployments** → find **Production** deployment
3. Click it → note the **Commit SHA** (e.g. `a638ef2` or different)
4. Compare to local: `git log -1 --oneline`
5. If different: document in TRUTH_PLAN.md what commit is live

---

## 3. Stripe Verification

Validates price IDs and webhook events. **Run before every production deploy.**

### Option A — Admin UI (no secrets needed)

1. Log in at https://pptides.com with an admin email (in ADMIN_EMAIL_WHITELIST)
2. Go to **Admin** → **Health** tab
3. Click **Stripe** — runs verify using Supabase secrets

### Option B — Terminal

1. Get `STRIPE_SECRET_KEY` from [Stripe Dashboard](https://dashboard.stripe.com/apikeys) or Supabase Edge Function secrets
2. In terminal:
   ```bash
   cd ~/Desktop/Projects/REWIRE/peptide-protocols
   STRIPE_SECRET_KEY=sk_live_xxx npm run verify-stripe
   ```
3. Or use CRON_SECRET for remote: `CRON_SECRET=xxx npm run verify-stripe:remote`

4. Confirm:
   - ✅ essentials + elite price IDs exist and match SOURCE_OF_TRUTH
   - ✅ All 11 required webhook events registered (checkout.session.completed, customer.subscription.*, invoice.*, etc.)

### Expected price IDs (constants)

- Essentials: `price_1T6QrYAT1lRVVLw7UNdI4t2g`
- Elite: `price_1T6QrZAT1lRVVLw7qu0FZIWT`

If these changed in Stripe, update `scripts/verify-stripe.js` and `create-checkout` function.

---

## 4. npm audit (Security)

**Current:** 30 vulnerabilities (5 moderate, 25 high). `npm audit fix --force` is **breaking** — downgrades Vercel/vite-plugin-pwa.

### Recommendation

- **Do NOT run** `npm audit fix --force` without testing — it may break deploy.
- Monitor for upstream fixes: `vite-plugin-pwa`, `vercel` — update when non-breaking patches exist.
- Vulnerabilities are mostly in **dev/build** deps (Vercel, workbox) — not in runtime user code.

---

## 5. Database Migrations

**Status (2026-03-02):** All migrations applied. `supabase db push` was run; 20260302100001 and 20260302100002 are now on remote.

### After adding new migrations

```bash
cd ~/Desktop/Projects/REWIRE/peptide-protocols
supabase db push
```

---

## 6. Edge Function Deployment

**Status (2026-03-02):** All 14 functions deployed via `supabase functions deploy <name> --no-verify-jwt`.

After code changes to any edge function:

```bash
supabase functions deploy <name> --no-verify-jwt
```

Replace `<name>` with: `stripe-webhook`, `ai-coach`, `create-checkout`, `send-welcome-email`, `delete-account`, `cancel-subscription`, `health-check`, `admin-stats`, `trial-reminder`, `create-portal-session`, `inbound-email`, `admin-actions`, `send-enquiry-reply`, `verify-stripe`.

---

## 7. Live E2E Checklist (Manual Browser)

Run after deploy. Open https://pptides.com in incognito.

| Flow | Steps | Expected |
|------|-------|----------|
| Landing | Visit / | Hero, 34 ر.س, 371 ر.س, 3 أيام, CTAs |
| Library | Visit /library | 41 peptides, category filter, search |
| Paywall | Visit /peptide/tirzepatide (anon) | Blurred content, "اشترك لعرض البروتوكول" |
| Pricing | Visit /pricing | Essentials/Elite, trial messaging |
| Protected | Visit /dashboard (anon) | Redirect to /login?redirect=%2Fdashboard |
| Coach | Visit /coach (anon) | "محتوى للمشتركين فقط" modal |
| Login | Visit /login | Email, Google, forgot password |
| Signup→Checkout | Create account → Subscribe | Stripe Checkout, payment=success redirect |
| Coach AI | Log in (trial) → /coach → send message | Response (if DEEPSEEK_API_KEY set) or 500 |

---

## 8. Cron Jobs (Supabase)

Trial reminder and health check run on cron. Verify in Supabase Dashboard → Database → Extensions → pg_cron (or scheduled functions).

- `trial-reminder`: Expiring trials, day-1/day-2 emails
- `health-check`: Alerts on failure

---

## 9. Vercel Env Vars

Ensure these are set in Vercel project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN` (optional — for error tracking)
- `VITE_GA4_ID` (optional — for analytics)

---

*Last updated: 2026-03-02. Run `npm run predeploy` before every deploy.*
