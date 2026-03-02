import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const cronSecret = Deno.env.get('CRON_SECRET') ?? ''

const EXPECTED = {
  essentials: 'price_1T6QrYAT1lRVVLw7UNdI4t2g',
  elite: 'price_1T6QrZAT1lRVVLw7qu0FZIWT',
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

serve(async (req) => {
  const headers = { 'Content-Type': 'application/json' }
  const auth = req.headers.get('x-cron-secret') || req.headers.get('authorization')
  if (!cronSecret || !auth || (!constantTimeCompare(auth, cronSecret) && !constantTimeCompare(auth, `Bearer ${cronSecret}`))) {
    return new Response(JSON.stringify({ error: 'Unauthorized — set x-cron-secret header' }), { status: 401, headers })
  }

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY not set' }), { status: 500, headers })
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  const result: { prices: Record<string, unknown>; webhooks: unknown[]; eventsOk: boolean; missingEvents: string[] } = {
    prices: {},
    webhooks: [],
    eventsOk: false,
    missingEvents: [],
  }

  try {
    for (const [tier, priceId] of Object.entries(EXPECTED)) {
      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] })
      const product = price.product as { name?: string } | null
      result.prices[tier] = {
        id: priceId,
        unit_amount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring?.interval || 'one-time',
        productName: product?.name ?? 'N/A',
        ok: true,
      }
    }
  } catch (e) {
    result.prices = { error: String(e) }
  }

  try {
    const webhooks = await stripe.webhookEndpoints.list()
    result.webhooks = webhooks.data.map(w => ({
      url: w.url,
      status: w.status,
      events: w.enabled_events?.slice(0, 5),
      eventsCount: w.enabled_events?.length ?? 0,
    }))
    const required = [
      'checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated',
      'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed',
      'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed',
      'charge.dispute.created', 'charge.refunded', 'customer.subscription.trial_will_end',
    ]
    const allEvents = webhooks.data.flatMap(w => w.enabled_events || [])
    result.missingEvents = required.filter(e => !allEvents.includes(e))
    result.eventsOk = result.missingEvents.length === 0
  } catch (e) {
    result.webhooks = [{ error: String(e) }]
  }

  return new Response(JSON.stringify({
    status: result.prices && !('error' in result.prices) && result.eventsOk ? 'ok' : 'issues',
    ...result,
    timestamp: new Date().toISOString(),
  }, null, 2), { status: 200, headers })
})
