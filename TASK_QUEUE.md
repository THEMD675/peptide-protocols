# TASK_QUEUE.md — Persistent Task Tracker

Agents: read this file first. Pick the next unchecked `[ ]` task. Mark `[x]` when done.

## Completed ✅
- [x] 2026-03-05 Lint errors fixed (unused var, missing hook deps)
- [x] 2026-03-05 Open redirect vulnerability in Login.tsx
- [x] 2026-03-05 Blog schema cache fix (PostgREST refresh)
- [x] 2026-03-05 Footer/Header touch targets 44px WCAG
- [x] 2026-03-05 React inert warning fix
- [x] 2026-03-05 JSON-LD structured data on Landing + Blog + 11 pages
- [x] 2026-03-05 Hardcoded Stripe price fallbacks removed
- [x] 2026-03-05 ENVIRONMENT=production set in Supabase secrets
- [x] 2026-03-05 Admin user search — server-side pagination (removed 50 cap)
- [x] 2026-03-05 grant_subscription — grant_source tracking column
- [x] 2026-03-05 Coach auto-send — added .catch() error handling
- [x] 2026-03-05 og:description on 7 pages
- [x] 2026-03-05 Glossary expanded to 60+ terms
- [x] 2026-03-05 Peptide count consistency fix
- [x] 2026-03-05 CSV injection fix (proper escapeCSV)
- [x] 2026-03-05 Dashboard data accuracy (limit 5000 not 5)
- [x] 2026-03-05 Tracker stats accuracy (limit 10000 not 50)
- [x] 2026-03-05 Tracker division by zero fix (cycle_weeks fallback)
- [x] 2026-03-05 Manual Vercel deploy pipeline working
- [x] 2026-03-05 Puppeteer audit — 28/28 pages clean on mobile
- [x] 2026-03-05 3 perfection loop rounds — zero issues remaining
- [x] 2026-03-07 Email template migration — ALL 5 edge functions use shared emailWrapper
- [x] 2026-03-07 MRR annual subscriber fix — divides annual by 12
- [x] 2026-03-07 Revenue actuals — ARR, ARPU, churn rate in admin-stats
- [x] 2026-03-07 Smart dunning emails — day 3 and day 7 follow-ups for past_due
- [x] 2026-03-07 Grant subscription auto-expiry — cron expires non-Stripe grants past period end
- [x] 2026-03-07 BodyMap rotation intelligence — suggests next injection site
- [x] 2026-03-07 Protocol completion certificate — share button on completed protocols
- [x] 2026-03-07 Landing contact button — floating email button
- [x] 2026-03-07 CSP meta tag — Content-Security-Policy for XSS protection
- [x] 2026-03-07 Community replies + upvotes UI — fully built in Community.tsx
- [x] 2026-03-07 Admin audit log UI — tab with entries in Admin.tsx
- [x] 2026-03-07 Admin user detail view — modal with subscription/logs/coach history
- [x] 2026-03-07 Coach server-side conversation history — coach_conversations table
- [x] 2026-03-07 In-app upsell — Crown banner in Coach when limit reached (Essentials → Elite)
- [x] 2026-03-07 WhatsApp referral sharing — ShareableCard sends referral code via wa.me
- [x] 2026-03-07 Referral system — fully wired (Landing → send-welcome-email → create-checkout → stripe-webhook reward)
- [x] 2026-03-07 Weekly email report — trial-reminder sends weekly summary to active users
- [x] 2026-03-07 Level system — beginner/intermediate/advanced in Dashboard header
- [x] 2026-03-07 Smart protocol suggestions — next peptide suggestion when cycle 80% done
- [x] 2026-03-07 Achievement badges — 7 badges in Dashboard (first injection, streaks, etc.)
- [x] 2026-03-07 Journey timeline — "رحلتي" section in Dashboard
- [x] 2026-03-07 Weekly challenge — "سجّل كل يوم هذا الأسبوع" in Dashboard
- [x] 2026-03-07 Recommended peptides — goal-based recommendations in Dashboard
- [x] 2026-03-07 React.lazy code splitting — ALL routes lazy-loaded in App.tsx
- [x] 2026-03-07 Admin mobile responsive — grid-cols-2 stats, overflow-x-auto tabs, px-4 container
- [x] 2026-03-07 Cancel retention flow — Account.tsx has retention step with survey before cancel

## Open Tasks (require external access or human action)
- [ ] Stripe STAY30 retention coupon — verify it exists in Stripe Dashboard, apply in cancel flow
- [ ] CAPTCHA on auth forms — needs Cloudflare Turnstile site key from dashboard.cloudflare.com
- [ ] Google Search Console — needs Google login, add pptides.com, submit sitemap.xml
- [ ] Supabase email templates — translate 6 auth email templates to Arabic in Dashboard
- [ ] Sentry source maps — needs SENTRY_AUTH_TOKEN from sentry.io, add to Vercel env
- [ ] Staging environment — needs Supabase branching from dashboard
- [ ] Isolate from ravora.app — create new Supabase project from dashboard
- [ ] GitHub Actions VERCEL_TOKEN — needs Ameer to create token in Vercel Dashboard
- [ ] Saudi PDPL compliance — needs lawyer review
- [ ] Content liability review — needs lawyer for Coach dosage advice
- [ ] Medical content review — 63 peptide dosages need pharmacist/doctor verification
- [ ] Interactions data completeness — only ~20 combos, needs medical review
- [ ] Blog content — 3 placeholder posts exist, need real Arabic SEO articles
- [ ] Video injection guides — need actual video files filmed
- [ ] Expert advisory board — need real doctor/pharmacist names
- [ ] Stripe test customers cleanup — 100+ cancelled/expired test customers
