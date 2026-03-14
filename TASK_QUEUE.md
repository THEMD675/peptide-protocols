# TASK_QUEUE.md — Persistent Task Tracker

Agents: read this file first. Pick the next unchecked `[ ]` task. Mark `[x]` when done.

## Completed
- [x] Isolate from ravora — migrated to dedicated Supabase project rxxzphwojutewvbfzgqd
- [x] RLS enabled on all tables
- [x] Google login switched to ID Token flow
- [x] Auto-trial subscription on signup
- [x] Column mismatches fixed (reviews.content→body, community_logs, side_effect_logs)
- [x] Sentry dead code removed (-436KB)
- [x] Drug-peptide interactions added (metformin, insulin, warfarin, SSRIs, thyroid, statins, NSAIDs)
- [x] Glossary expanded to 82 terms
- [x] Stripe rebranded to Verdix / Amiris Group
- [x] Admin emails moved to shared constant
- [x] Tracker streak uses full logs
- [x] Coach conversations wired to Supabase
- [x] CAPTCHA — Cloudflare Turnstile integrated
- [x] All 16 edge functions deployed and ACTIVE on new project
- [x] All secrets set on new Supabase project
- [x] CI/CD pipeline with GitHub Actions (lint, typecheck, test, build, deploy)
- [x] GitHub Actions secrets set (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- [x] STAY30 retention coupon active in Stripe
- [x] Email template system — all functions use shared emailWrapper
- [x] MRR, ARR, ARPU, churn in admin-stats
- [x] Smart dunning emails (day 3, day 7)
- [x] Re-engagement emails (day 30, day 60 win-back)
- [x] Weekly email enhanced with wellness + protocol progress
- [x] ShareableCard image export via html2canvas
- [x] Level system with progress bar
- [x] Quiz "ابدأ بروتوكول" button
- [x] Verified subscriber badge on Reviews
- [x] Email change syncs to Stripe customer
- [x] CSP headers (index.html + vercel.json)
- [x] BodyMap rotation intelligence
- [x] Protocol completion certificate share
- [x] Landing contact button
- [x] Sentry fully removed — all code, packages, CSP entries, env vars stripped
- [x] 73 tests passing, 0 TypeScript errors

## Open — require human action
- [ ] Google Search Console — needs Google password for abdullah@amirisgroup.co
- [ ] Blog content — 3 posts exist, need more real Arabic SEO articles
- [ ] Video injection guides — need actual video files filmed
- [ ] Expert advisory board — need real doctor/pharmacist names
- [ ] Saudi PDPL compliance — needs lawyer review
- [ ] Medical content review — peptide dosages need pharmacist verification
