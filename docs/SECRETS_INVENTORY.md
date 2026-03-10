# Secrets Inventory — pptides

**Last updated:** 2026-03-02  
**Project:** rxxzphwojutewvbfzgqd (Supabase)  
**Live:** https://pptides.com

---

## 1. Local `.env` (frontend dev)

| Key | Present | Where to get |
|-----|---------|--------------|
| `VITE_SUPABASE_URL` | ✅ | https://rxxzphwojutewvbfzgqd.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase Dashboard → Project Settings → API |
| `VITE_GA4_ID` | — | Google Analytics 4 |
| `STRIPE_SECRET_KEY` | — | For `npm run verify-stripe` only; Supabase Dashboard → Edge Functions → Secrets |

---

## 2. Supabase Edge Function Secrets (all set ✅)

Listed via `supabase secrets list`. **Do not store these in git.**

| Secret | Used by | Purpose |
|--------|---------|---------|
| `SUPABASE_URL` | All | Project URL |
| `SUPABASE_ANON_KEY` | All | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | All | Service role (bypass RLS) |
| `STRIPE_SECRET_KEY` | stripe-webhook, create-checkout, cancel-sub, delete-account, admin-actions, verify-stripe | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook | Verify webhook signatures |
| `STRIPE_PRICE_ESSENTIALS` | create-checkout | Monthly Essentials price ID |
| `STRIPE_PRICE_ESSENTIALS_ANNUAL` | create-checkout | Annual Essentials |
| `STRIPE_PRICE_ELITE` | create-checkout | Monthly Elite |
| `STRIPE_PRICE_ELITE_ANNUAL` | create-checkout | Annual Elite |
| `DEEPSEEK_API_KEY` | ai-coach | Coach AI |
| `RESEND_API_KEY` | send-welcome-email, send-enquiry-reply, admin-actions | Transactional email |
| `RESEND_DOMAIN` | Resend | Sending domain |
| `CRON_SECRET` | trial-reminder, health-check (cron) | Auth for scheduled calls |
| `APP_URL` | Various | https://pptides.com |
| `ADMIN_EMAIL_WHITELIST` | (Supabase has it) | May be legacy; see below |
| `RESEND_WEBHOOK_SECRET` | inbound-email | Verify inbound webhook (add if using inbound email) |
| `SUPPORT_FORWARD_EMAIL` | inbound-email | Forward enquiries to |
| `VAPID_PUBLIC_KEY` | Push notifications | Web push |
| `VAPID_PRIVATE_KEY` | Push notifications | Web push |

---

## 3. Admin Access (hardcoded in code)

**File:** `supabase/functions/_shared/admin-auth.ts`

```ts
export const ADMIN_EMAILS = [
  'abdullah@amirisgroup.co',
  'abdullahalameer@gmail.com',
  'contact@pptides.com',
]
```

To add an admin: edit this file, commit, redeploy `admin-stats` and `admin-actions`:

```bash
supabase functions deploy admin-stats --no-verify-jwt
supabase functions deploy admin-actions --no-verify-jwt
```

---

## 4. Vercel Environment Variables

| Key | Purpose |
|-----|---------|
| `VITE_SUPABASE_URL` | Required |
| `VITE_SUPABASE_ANON_KEY` | Required |
| `VITE_GA4_ID` | Optional — analytics |

---

## 5. Manual Verification Commands

**Stripe (local — needs key from Supabase Dashboard):**
```bash
# Get STRIPE_SECRET_KEY from Supabase → Edge Functions → Secrets, then:
STRIPE_SECRET_KEY=sk_xxx npm run verify-stripe
```

**Health check (remote — needs CRON_SECRET):**
```bash
# Get CRON_SECRET from Supabase → Edge Functions → Secrets, then:
CRON_SECRET=xxx npm run verify-health
```

**Or use Admin UI (no secrets needed):**  
Log in as admin → Admin → Health tab → Run Health Check | Run Stripe.

---

## 6. Where to Find Secrets

| Source | URL |
|--------|-----|
| Supabase Dashboard | https://supabase.com/dashboard/project/rxxzphwojutewvbfzgqd |
| Supabase → Edge Functions → Secrets | Dashboard → Edge Functions → (project) → Secrets |
| Stripe API keys | https://dashboard.stripe.com/apikeys |
| Stripe Webhooks | https://dashboard.stripe.com/webhooks |
| Resend | https://resend.com/api-keys |
| DeepSeek | https://platform.deepseek.com |
