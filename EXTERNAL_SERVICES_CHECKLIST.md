# pptides.com — External Services Checklist

Every external service, required configuration, and verification steps.

---

## Stripe

**Dashboard:** [dashboard.stripe.com](https://dashboard.stripe.com)

### Webhook Events (11 required)

Register these events for your webhook endpoint (`https://<project>.supabase.co/functions/v1/stripe-webhook`):

1. `checkout.session.completed`
2. `customer.subscription.created`
3. `customer.subscription.updated`
4. `customer.subscription.deleted`
5. `invoice.paid`
6. `invoice.payment_failed`
7. `checkout.session.async_payment_succeeded`
8. `checkout.session.async_payment_failed`
9. `charge.dispute.created`
10. `charge.refunded`
11. `customer.subscription.trial_will_end`

### Price IDs

- **Essentials:** Set in Supabase Edge Function secrets as `STRIPE_PRICE_ESSENTIALS`
- **Elite:** Set in Supabase Edge Function secrets as `STRIPE_PRICE_ELITE`

### Branding

1. Go to **Settings → Branding**
2. Update: Business name, Icon, Brand color, Accent color
3. Go to **Settings → Business → Public details → Statement descriptor**

### Verification

- **Webhook health:** Dashboard → Webhooks → your endpoint → "Recent deliveries" — all should show 200
- **Test mode:** Use test keys for development; switch to live keys for production

---

## Resend

**Dashboard:** [resend.com](https://resend.com)

### Domain Verification

1. Add `pptides.com` as a sending domain
2. Add DNS records (SPF, DKIM) provided by Resend
3. Verify domain shows as "Verified" in Resend dashboard

### Rate Limits

- Free tier: 100 emails/day, 3,000/month
- Paid plans: higher limits — check your plan

### Inbound Webhook

1. Create an **Inbound** route for `*@pptides.com` (or specific address)
2. Webhook URL: `https://<project>.supabase.co/functions/v1/inbound-email`
3. Set `RESEND_WEBHOOK_SECRET` in Supabase Edge Function secrets (from Resend)
4. Optional: `SUPPORT_FORWARD_EMAIL` (defaults to contact@pptides.com) — where inbound emails are forwarded

### Verification

- **Emails sending:** Resend → Emails — filter by domain `pptides.com`, check recent sends
- **Bounces:** If emails bounce, re-check SPF/DKIM/DMARC records

---

## DeepSeek

**Dashboard:** [platform.deepseek.com](https://platform.deepseek.com)

### API Key

- Create an API key
- Set in Supabase Edge Function secrets as `DEEPSEEK_API_KEY`

### Spending Cap

- Set a spending cap in the DeepSeek dashboard to avoid unexpected charges

### Rate Limits

- Check your plan's rate limits (requests per minute, tokens per minute)

### Verification

- AI Coach in app should return responses — if 500s, check Edge Function logs for `DEEPSEEK_API_KEY` errors

---

## Supabase

**Dashboard:** [supabase.com/dashboard](https://supabase.com/dashboard)

### Auth Settings

- **Email confirmation:** OFF (or configure SMTP for custom emails)
- **Site URL:** `https://pptides.com`
- **Redirect URLs:** Include `https://pptides.com/**` and any preview URLs if needed

### Plan Tier

- **Must be Pro** — Free tier has limitations (no point-in-time recovery, limits on Edge Functions, etc.)

### Email Templates (Arabic)

- Auth → Email Templates
- Customize confirmation, reset password, etc. in Arabic (`dir="rtl"`) if using Supabase auth emails

### Verification

- Health check: Call `https://<project>.supabase.co/functions/v1/health-check` — should return all services OK

---

## Vercel

**Dashboard:** [vercel.com](https://vercel.com)

### Environment Variables (Frontend)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_GA4_ID` | Google Analytics 4 Measurement ID |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking |

Set for Production (and Preview if you want analytics on preview deploys).

### Verification

- Deploy succeeds; app loads and Auth/Supabase connection works

---

## Google Search Console

**Dashboard:** [search.google.com/search-console](https://search.google.com/search-console)

### Setup

1. Add property for `https://pptides.com`
2. Verify ownership (HTML tag, DNS, or Google Analytics)
3. Submit sitemap: `https://pptides.com/sitemap.xml` (or your sitemap URL)

### Verification

- Property shows as verified; sitemap submitted and indexed

---

## Google Analytics

**Dashboard:** [analytics.google.com](https://analytics.google.com)

### Setup

1. Create a GA4 property
2. Get the **Measurement ID** (format: `G-XXXXXXXXXX`)
3. Set in Vercel as `VITE_GA4_ID`

### Verification

- Real-time report shows visits when you browse the site

---

## Sentry

**Dashboard:** [sentry.io](https://sentry.io)

### Setup

1. Create a project (e.g. `pptides-web`)
2. Get the **DSN** (Client Key DSN)
3. Set in Vercel as `VITE_SENTRY_DSN`

### Verification

- Trigger a test error; it should appear in Sentry

---

## DNS (Email Deliverability)

For `pptides.com` — ensure these are set for Resend and general email:

| Record | Type | Value |
|--------|------|-------|
| SPF | TXT | `v=spf1 include:_spf.resend.com ~all` |
| DKIM | TXT | (Provided by Resend during domain verification) |
| DMARC | TXT | `v=DMARC1; p=none; rua=mailto:contact@pptides.com` |

### Verification

- Resend dashboard shows domain as verified
- Use an SPF/DKIM checker to validate records
