#!/usr/bin/env node
/**
 * Stripe verification — run: STRIPE_SECRET_KEY=sk_xxx node scripts/verify-stripe.js
 * Requires: npm install stripe (or run from project with stripe in deps)
 * Get key: Supabase Dashboard → Edge Functions → Secrets, or Stripe Dashboard → API keys
 */
const EXPECTED = {
  essentials: 'price_1T6QrYAT1lRVVLw7UNdI4t2g',
  elite: 'price_1T6QrZAT1lRVVLw7qu0FZIWT',
};

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY. Run: STRIPE_SECRET_KEY=sk_xxx node scripts/verify-stripe.js');
  process.exit(1);
}

async function verify() {
  let Stripe;
  try {
    Stripe = (await import('stripe')).default;
  } catch {
    console.error('Install stripe first: npm install stripe');
    process.exit(1);
  }
  const stripe = new Stripe(key, { apiVersion: '2023-10-16' });

  console.log('=== Stripe Verification ===\n');

  // 1. Verify price IDs
  for (const [tier, priceId] of Object.entries(EXPECTED)) {
    try {
      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const product = price.product;
      const productName = typeof product === 'object' && product?.name ? product.name : 'N/A';
      console.log(`✅ ${tier}: ${priceId}`);
      console.log(`   Unit amount: ${price.unit_amount} ${price.currency.toUpperCase()}`);
      console.log(`   Recurring: ${price.recurring?.interval || 'one-time'}`);
      console.log(`   Product: ${productName}`);
    } catch (e) {
      console.log(`❌ ${tier}: ${priceId} — ${e.message}`);
    }
  }

  // 2. List webhooks
  console.log('\n=== Webhook Endpoints ===');
  const webhooks = await stripe.webhookEndpoints.list();
  for (const w of webhooks.data) {
    console.log(`URL: ${w.url}`);
    console.log(`  Events: ${w.enabled_events?.join(', ') || 'all'}`);
    console.log(`  Status: ${w.status}`);
  }

  // 3. Required events per EXTERNAL_SERVICES_CHECKLIST
  const required = [
    'checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated',
    'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed',
    'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed',
    'charge.dispute.created', 'charge.refunded', 'customer.subscription.trial_will_end',
  ];
  const allEvents = webhooks.data.flatMap((w) => w.enabled_events || []);
  const missing = required.filter((e) => !allEvents.includes(e));
  if (missing.length) {
    console.log('\n⚠️  Missing webhook events:', missing.join(', '));
  } else {
    console.log('\n✅ All 11 required webhook events registered');
  }
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
