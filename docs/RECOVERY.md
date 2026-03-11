# pptides.com — Disaster Recovery Procedure

## 1. Database (Supabase)

### Backup Info
- **Provider:** Supabase (WAL-G daily physical backups)
- **Project:** rxxzphwojutewvbfzgqd
- **Region:** Central EU
- **PITR:** Not enabled (Pro plan feature)

### Restore Steps
1. Go to https://supabase.com/dashboard/project/rxxzphwojutewvbfzgqd/settings/general
2. Under "Backups", select the desired daily backup
3. Click "Restore" — this replaces the current database entirely
4. Wait ~5 minutes for restore to complete
5. Verify: `curl https://rxxzphwojutewvbfzgqd.supabase.co/rest/v1/user_profiles?select=count -H "apikey: <anon_key>"`

### Manual Data Export (run periodically)
```bash
# Export critical tables
SUPABASE_URL="https://rxxzphwojutewvbfzgqd.supabase.co"
SERVICE_ROLE="<service_role_key>"
for table in user_profiles user_subscriptions injection_logs lab_results community_logs enquiries; do
  curl -s "$SUPABASE_URL/rest/v1/$table?select=*" \
    -H "apikey: $SERVICE_ROLE" \
    -H "Authorization: Bearer $SERVICE_ROLE" \
    > "backup_${table}_$(date +%Y%m%d).json"
done
```

## 2. Frontend (Vercel)

### Current Setup
- **Repo:** github.com/THEMD675/peptide-protocols
- **Framework:** Vite + React + TypeScript
- **Hosting:** Vercel (peptide-protocols project)
- **Domain:** pptides.com

### Redeploy from Scratch
```bash
cd /tmp && rm -rf pptides-deploy
git clone --depth 1 https://github.com/THEMD675/peptide-protocols.git pptides-deploy
cd pptides-deploy
npx vercel link --yes --project peptide-protocols
npx vercel --prod --yes
```

### Rollback to Previous Deployment
1. Go to https://vercel.com/abdullahs-projects-08621839/peptide-protocols/deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

## 3. Edge Functions (Supabase)

### Redeploy All
```bash
cd ~/Desktop/Projects/REWIRE/peptide-protocols
supabase functions deploy --project-ref rxxzphwojutewvbfzgqd
```

### Verify
```bash
curl https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/health-check
```

## 4. DNS & Domain

### pptides.com
- Registrar: check Vercel domain settings
- DNS: Vercel-managed (CNAME to cname.vercel-dns.com)
- SSL: Vercel auto-renews

## 5. Stripe

### Webhook Endpoint
- URL: `https://rxxzphwojutewvbfzgqd.supabase.co/functions/v1/stripe-webhook`
- Events: checkout.session.completed, subscription.created/updated/deleted, invoice.paid/payment_failed, charge.dispute.created, charge.refunded, customer.subscription.trial_will_end, checkout.session.expired

### If Webhook Breaks
1. Go to https://dashboard.stripe.com/webhooks
2. Find the endpoint → check for failures
3. Retry failed events manually
4. If endpoint URL changed, update in Stripe dashboard

## 6. Email (Resend)

### Config
- From: contact@pptides.com
- Provider: Resend
- DNS: SPF, DKIM, DMARC all configured on pptides.com

### If Emails Stop
1. Check Resend dashboard for bounces/failures
2. Verify DNS records still point to Resend
3. Check Supabase secrets: RESEND_API_KEY

## 7. Monitoring Checklist (Post-Recovery)

After any recovery, verify:
- [ ] pptides.com loads (HTTP 200)
- [ ] Login works (Supabase Auth)
- [ ] Subscription flow works (Stripe → webhook → DB)
- [ ] Edge functions respond (health-check)
- [ ] Emails send (trigger test via contact form)
- [ ] Blog posts load (static data)
- [ ] PWA service worker updates

## 8. Key Contacts & Access

| Service | Dashboard |
|---------|-----------|
| Supabase | supabase.com/dashboard/project/rxxzphwojutewvbfzgqd |
| Vercel | vercel.com/abdullahs-projects-08621839/peptide-protocols |
| Stripe | dashboard.stripe.com |
| GitHub | github.com/THEMD675/peptide-protocols |
| Resend | resend.com/emails |
| Cloudflare | dash.cloudflare.com |
