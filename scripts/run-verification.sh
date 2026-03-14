#!/bin/bash
# pptides — Run Health & Stripe verification
# Requires: CRON_SECRET and optionally STRIPE_SECRET_KEY from Supabase Dashboard → Edge Functions → Secrets
# Get them from: https://supabase.com/dashboard/project/rxxzphwojutewvbfzgqd/settings/functions

set -e
PROJECT_URL="https://rxxzphwojutewvbfzgqd.supabase.co"

echo "=== pptides Verification ==="
echo ""

# Health check (needs CRON_SECRET)
if [ -n "$CRON_SECRET" ]; then
  echo "Running remote health check..."
  curl -s -H "x-cron-secret: $CRON_SECRET" "$PROJECT_URL/functions/v1/health-check" | jq . 2>/dev/null || curl -s -H "x-cron-secret: $CRON_SECRET" "$PROJECT_URL/functions/v1/health-check"
  echo ""
else
  echo "CRON_SECRET not set. Run: export CRON_SECRET=<from Supabase Secrets>"
  echo "Or use Admin UI: https://pptides.com/admin → Health tab → Run Health Check"
fi

# Stripe verify (local script, needs STRIPE_SECRET_KEY)
if [ -n "$STRIPE_SECRET_KEY" ]; then
  echo "Running Stripe verification..."
  npm run verify-stripe 2>/dev/null || node scripts/verify-stripe.js
  echo ""
else
  echo "STRIPE_SECRET_KEY not set. Run: export STRIPE_SECRET_KEY=<from Supabase Secrets>"
  echo "Or use Admin UI: https://pptides.com/admin → Health tab → Stripe button"
fi

echo ""
echo "Done. See docs/SECRETS_INVENTORY.md for where to find secrets."
