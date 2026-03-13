/**
 * Vercel Cron Handler: /api/cron
 * Dispatches scheduled jobs to Supabase edge functions.
 * Configured in vercel.json crons section.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const JOBS: Record<string, string[]> = {
  hourly: ['onboarding-drip', 'trial-reminder'],
  daily: ['daily-digest', 'reengagement-email', 'trial-winback', 'win-back-email', 'abandoned-checkout-recovery'],
  weekly: ['coach-notifications'],
};

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

  return res.status(ok ? 200 : 207).json({ schedule, results });
}
