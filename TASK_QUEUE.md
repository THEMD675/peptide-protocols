# TASK_QUEUE.md — Persistent Task Tracker

Agents: read this file first. Pick the next unchecked `[ ]` task. Mark `[x]` when done.

## Completed
- [x] STAY30 retention coupon — exists in Stripe, wired into cancel flow in Account.tsx
- [x] CAPTCHA — Cloudflare Turnstile created via API, integrated in Login.tsx, deployed
- [x] Supabase email templates — verified Arabic in dashboard (confirm signup, reset password)
- [x] Stripe test customers cleanup — deleted 185 test/duplicate customers
- [x] All 16 edge functions deployed and ACTIVE
- [x] All 7 email-sending functions use shared emailWrapper template
- [x] Logo dir="ltr" fix — displays "pptides" not "tidespp" in RTL
- [x] MRR calculates annual subscribers correctly (÷12)
- [x] Revenue actuals — ARR, ARPU, churn rate in admin-stats
- [x] Smart dunning emails — day 3, day 7 follow-ups for past_due
- [x] Grant subscription auto-expiry via cron
- [x] BodyMap rotation intelligence
- [x] Protocol completion certificate share
- [x] Landing contact button
- [x] CSP Content-Security-Policy (index.html + vercel.json)
- [x] 73 tests passing, 0 TypeScript errors, build succeeds

## Open Tasks — require Google Workspace password
- [ ] Google Search Console — needs Google password for abdullah@amirisgroup.co
- [ ] Sentry — account exists (Google SSO), needs same Google password to log in

## Open Tasks — require human action
- [ ] Isolate from ravora.app — create new Supabase project
- [ ] Blog content — 3 posts exist, need more real Arabic SEO articles
- [ ] Video injection guides — need actual video files
- [ ] Expert advisory board — need real names
- [ ] GitHub Actions VERCEL_TOKEN — create in Vercel Dashboard
- [ ] Staging environment — Supabase branching

## Next Sprint — Infra Fixes (DO NOW — DO NOT STOP)
- [ ] Fix Tracker streak bug — computeStreak(logs) uses paginated 50-row array, needs separate full fetch for streak/calendar
- [ ] Remove ALL Sentry dead code from 7 files (App.tsx, main.tsx, ProtocolWizard.tsx, CookieConsent.tsx, analytics.ts, supabase.ts, Privacy.tsx)
- [ ] Wire coach_conversations table — ai-coach should save/load conversation history server-side, not just localStorage
- [ ] Add drug-peptide interactions to interactions.ts (metformin, insulin, blood thinners, immunosuppressants, SSRIs)
- [ ] Expand glossary.ts from current count to 80+ Arabic peptide/medical/wellness terms
- [ ] Clean Stripe test customers — archive all test/duplicate customers via Stripe API
- [ ] Partial refund handling in stripe-webhook — currently only handles full refunds
- [ ] Admin hardcoded emails — move from Header.tsx to shared constant or env var
