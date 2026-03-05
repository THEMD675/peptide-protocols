# TASK_QUEUE.md — Persistent Task Tracker

Agents: read this file first. Pick the next unchecked `[ ]` task. Mark `[x]` when done.

## Completed ✅
- [x] 2026-03-05 Lint errors fixed (unused var, missing hook deps)
- [x] 2026-03-05 Open redirect vulnerability in Login.tsx
- [x] 2026-03-05 Blog schema cache fix (PostgREST refresh)
- [x] 2026-03-05 Footer/Header touch targets 44px WCAG
- [x] 2026-03-05 React inert warning fix
- [x] 2026-03-05 JSON-LD structured data on Landing + Blog
- [x] 2026-03-05 Hardcoded Stripe price fallbacks removed
- [x] 2026-03-05 ENVIRONMENT=production set in Supabase secrets
- [x] 2026-03-05 Admin user search — server-side pagination (removed 50 cap)
- [x] 2026-03-05 grant_subscription — grant_source tracking column
- [x] 2026-03-05 Coach auto-send — added .catch() error handling
- [x] 2026-03-05 JSON-LD on 11 remaining pages
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

## Open Tasks
- [ ] VITE_SENTRY_DSN — check if DSN exists anywhere, add to Vercel env if found
- [ ] Stripe test customers cleanup — 100 cancelled/expired test customers in live Stripe
- [ ] GitHub Actions VERCEL_TOKEN — needs Ameer to create new token in Vercel Dashboard
- [ ] Skool TRANSFORM course — upload 107 lessons to Skool classroom (manual browser work)
- [ ] Admin export table reference — verify email_logs vs email_list is correct
- [ ] grant_subscription — still DB-only, no Stripe billing created
- [ ] cancel_subscription — verify atomic DB+Stripe sync
- [ ] Blog — only 3 posts. Need more real Arabic SEO content
- [ ] Medical content — 63 peptide dosages unverified by pharmacist/doctor
- [ ] Interactions data — only ~20 combos, hardcoded
- [ ] ShareableCard — text-only sharing, no image export for WhatsApp
- [ ] Onboarding goals — don't feed Coach greeting
- [ ] Email templates — duplicated across 5 edge functions
- [ ] Community replies/upvotes UI — migrations exist, UI not built
- [ ] Admin audit log UI — table exists, no display
- [ ] Admin user detail view — click user → see full history
- [ ] Cancel retention offer — no Stripe coupon exists
- [ ] Video injection guides — planned, no video files
- [ ] CAPTCHA on auth forms
- [ ] Saudi PDPL compliance review
