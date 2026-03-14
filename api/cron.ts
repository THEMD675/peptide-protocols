/**
 * Vercel Cron Handler: /api/cron
 * Dispatches scheduled jobs to Supabase edge functions.
 * Configured in vercel.json crons section.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'contact@pptides.com';

const JOBS: Record<string, string[]> = {
  hourly: ['onboarding-drip', 'trial-reminder'],
  daily: ['daily-digest', 'reengagement-email', 'trial-winback', 'win-back-email', 'abandoned-checkout-recovery', 'stripe-reconciliation'],
  weekly: ['coach-notifications'],
};

// stripe-reconciliation: daily Stripe↔DB subscription status sync.
// Compares active Stripe subscriptions against DB `subscriptions` table
// to detect and fix status drift (e.g. missed webhooks, manual Stripe changes).
// Implementation: dedicated Supabase edge function `stripe-reconciliation`
// that lists active Stripe subs and reconciles with DB rows.
// TODO: Implement supabase/functions/stripe-reconciliation/index.ts

async function invokeFunction(name: string): Promise<{ name: string; ok: boolean; status?: number }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { name, ok: false, status: 0 };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET ?? '',
      },
      body: JSON.stringify({ source: 'vercel-cron' }),
    });
    return { name, ok: res.ok, status: res.status };
  } catch {
    return { name, ok: false };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized invocation
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const schedule = (req.query.schedule as string) || 'hourly';
  const functions = JOBS[schedule];
  if (!functions) {
    return res.status(400).json({ error: `Unknown schedule: ${schedule}` });
  }

  const results = await Promise.all(functions.map(invokeFunction));
  const ok = results.every(r => r.ok);

  if (!ok) {
    const failed = results.filter(r => !r.ok);
    const failedNames = failed.map(r => `${r.name} (status: ${r.status ?? 'N/A'})`).join(', ');
    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'pptides Cron <contact@pptides.com>',
            to: ADMIN_ALERT_EMAIL,
            subject: `[pptides] Cron ${schedule} partial failure`,
            html: `<p>Cron <strong>${schedule}</strong> had failures:</p><ul>${failed.map(r => `<li>${r.name} — status ${r.status ?? 'N/A'}</li>`).join('')}</ul><p>Time: ${new Date().toISOString()}</p>`,
          }),
        });
      } catch (e) {
        console.error('cron alert email failed:', e);
      }
    } else {
      console.error(`cron ${schedule} failures (no RESEND_API_KEY to alert): ${failedNames}`);
    }
  }

  return res.status(ok ? 200 : 207).json({ schedule, results });
}
