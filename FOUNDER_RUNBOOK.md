# pptides.com — Founder Runbook

Operational procedures for common tasks. All can be done without a developer.

---

## Refund a User

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/payments)
2. Find the payment by customer email
3. Click the payment → "Refund" → Full refund
4. Stripe automatically notifies the user via email
5. The webhook updates the subscription status in Supabase automatically

## Manually Activate a Subscription

If a user paid but their subscription didn't activate:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Table Editor → `subscriptions`
2. Find the row by `user_id` (search by email in `auth.users` first)
3. Set `status` to `active`, `tier` to `essentials` or `elite`
4. Set `current_period_end` to the correct date

## Check if Emails Are Sending

1. Go to [Resend Dashboard](https://resend.com/emails)
2. Check recent sends — filter by domain `pptides.com`
3. If emails show as bounced, check SPF/DKIM/DMARC records

## Check Error Logs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Edge Functions → Logs
2. Filter by function name (e.g., `stripe-webhook`)
3. Look for error-level entries

## Manual Steps (DEEPSEEK, Stripe, E2E)

See **MANUAL_STEPS_RUNBOOK.md** for step-by-step: DEEPSEEK_API_KEY in Supabase secrets, Stripe verify script, live E2E checklist.

## Check Stripe Webhook Health

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click your webhook endpoint
3. Check "Recent deliveries" — all should show 200 status
4. If deliveries are failing, check the error message

## Shared Supabase Risk

ppptides shares the Supabase project `hexnuldwerzwbljorokw` with ravora.app. Changes to auth, database, or Edge Functions in this project affect both apps. **Long-term:** Migrate pptides to its own Supabase project for isolation.

## Backup Strategy

- **Supabase Pro** includes point-in-time recovery (PITR). Verify your plan at [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → Billing.
- **Restore:** Dashboard → Database → Backups → choose restore point. Pro plan retains 7 days of PITR.
- **Manual backup:** Use pg_dump or Supabase SQL Editor to export critical tables if needed.

## Staging / Preview Deployments

Before deploying to production:

1. **Preview deploy:** Run `vercel` (without `--prod`) — creates a preview URL
2. **Test** on the preview URL: auth, checkout, AI coach, library
3. **Production deploy:** Run `vercel --prod --yes` only after preview looks good

## Deploy a Hotfix (Frontend)

**Before editing code:** Read `DEPENDENCY_MAP.md`. Changing peptides, constants, or trial config can break 20+ files. One line change = many consumers.

```bash
cd ~/Desktop/Projects/REWIRE/peptide-protocols
npx tsc --noEmit    # must pass
npx vite build      # must pass
vercel --prod --yes  # deploys to production
```

## Deploy an Edge Function

```bash
cd ~/Desktop/Projects/REWIRE/peptide-protocols
supabase functions deploy <function-name> --no-verify-jwt
```

Replace `<function-name>` with one of: `stripe-webhook`, `ai-coach`, `create-checkout`, `send-welcome-email`, `delete-account`, `cancel-subscription`, `health-check`, `admin-stats`, `trial-reminder`, `create-portal-session`, `inbound-email`.

## Run a Database Migration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Copy the SQL from the migration file in `supabase/migrations/`
3. Paste and run
4. Verify with a SELECT query

## Adding a New Peptide

1. Edit `src/data/peptides.ts`
2. Add the new peptide object following the existing format (see `Peptide` interface)
3. PEPTIDE_COUNT updates automatically (derived from `peptides.length` in `src/lib/constants.ts`)
4. Run `npx tsc --noEmit` and `npx vite build` — must pass
5. Deploy frontend: `vercel --prod --yes`
6. **Edge functions:** If `trial-reminder` or `send-welcome-email` use PEPTIDE_COUNT, update the local constant in those files (they have a SOURCE OF TRUTH comment pointing to constants.ts)

## Updating Peptide Content

1. Edit `src/data/peptides.ts`
2. Update the relevant peptide object (dosage, cycle, side effects, etc.)
3. Same process as adding: build and deploy. PEPTIDE_COUNT does not change unless you add/remove peptides

## Change Stripe Branding

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/settings/branding)
2. Update: Business name, Icon, Brand color, Accent color
3. Also update: Settings → Business → Public details → Statement descriptor

## External Services Checklist

| Service | Dashboard | What to Check |
|---------|-----------|---------------|
| Stripe | dashboard.stripe.com | 11 webhook events registered, price IDs correct, branding |
| Resend | resend.com | Domain verified, rate limits, inbound webhook URL |
| Supabase | supabase.com/dashboard | Auth settings, plan tier (not Free!), email templates in Arabic |
| Vercel | vercel.com | All 14 env vars set, deployment matches local |
| DeepSeek | platform.deepseek.com | API key limits, spending cap |
| Google Search Console | search.google.com/search-console | Site verified, sitemap submitted |
| Google Analytics | analytics.google.com | GA4 property created, VITE_GA4_ID set in Vercel |
| Sentry | sentry.io | Project created, VITE_SENTRY_DSN set in Vercel |

## Required Environment Variables

### Vercel (Frontend)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
- `VITE_GA4_ID` — Google Analytics 4 Measurement ID
- `VITE_SENTRY_DSN` — Sentry DSN

### Supabase (Edge Functions)
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_ESSENTIALS` — Stripe price ID for Essentials
- `STRIPE_PRICE_ELITE` — Stripe price ID for Elite
- `RESEND_API_KEY` — Resend API key
- `DEEPSEEK_API_KEY` — DeepSeek API key
- `APP_URL` — `https://pptides.com`
- `SUPABASE_SERVICE_ROLE_KEY` — auto-set by Supabase
- `CRON_SECRET` — secret for authenticating cron jobs

## DNS Records for Email

Ensure these are set for `pptides.com`:
- SPF: `v=spf1 include:_spf.resend.com ~all`
- DKIM: provided by Resend during domain verification
- DMARC: `v=DMARC1; p=none; rua=mailto:contact@pptides.com`
