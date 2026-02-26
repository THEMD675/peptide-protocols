import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const secret = req.headers.get('x-fix-secret')
  if (secret !== 'fix-trial-3days-now') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const results: string[] = []

  // Fix the trigger function to use 3 days
  const { error: sqlErr } = await supabase.rpc('exec_sql_fix', {
    sql_text: `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.subscriptions (user_id, status, tier, trial_ends_at)
        VALUES (NEW.id, 'trial', 'free', now() + interval '3 days');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
  })

  if (sqlErr) {
    results.push(`Trigger fix via RPC failed: ${sqlErr.message}`)
    results.push('Will use post-signup correction approach instead')
  } else {
    results.push('SUCCESS: Trigger function updated to 3 days')
  }

  // Fix existing trial users
  const { data: trialUsers, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('id, user_id, created_at, trial_ends_at, status')
    .eq('status', 'trial')

  if (fetchErr) {
    results.push(`ERROR fetching trials: ${fetchErr.message}`)
  } else {
    results.push(`Found ${trialUsers?.length ?? 0} trial users`)
    for (const user of (trialUsers ?? [])) {
      const created = new Date(user.created_at)
      const trialEnd = new Date(user.trial_ends_at)
      const durationDays = Math.round((trialEnd.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      if (durationDays > 4) {
        const correctEnd = new Date(created.getTime() + 3 * 24 * 60 * 60 * 1000)
        const { error: updateErr } = await supabase
          .from('subscriptions')
          .update({ trial_ends_at: correctEnd.toISOString() })
          .eq('id', user.id)
        if (updateErr) results.push(`ERROR fixing ${user.user_id}: ${updateErr.message}`)
        else results.push(`FIXED ${user.user_id}: ${durationDays}d → 3d`)
      } else {
        results.push(`OK ${user.user_id}: ${durationDays}d`)
      }
    }
  }

  const { count } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true })
  results.push(`Total subscriptions: ${count}`)

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  })
})
