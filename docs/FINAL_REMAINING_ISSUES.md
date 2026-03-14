# pptides — Final Remaining Issues Sweep

**Date:** 2026-03-14  
**Purpose:** Complete list of every remaining issue for planning. Categorizes by priority (P0–P3) and fix type (code / infrastructure / manual verification).

---

## What Was Already Fixed (Per User)

DB schema, queries, auth flow, payment flow, referral system, edge functions, security, a11y basics, RTL, CSS, SEO, error handling, SW cache, env vars, content counts, pricing UX, onboarding, community filter, language detection, holiday emails, currency detection, notification navigation, data export gap, protocol history, coach rate limiting, browser compatibility, memory leaks.

---

## P0 — Critical (Must Fix Before Scale)

| # | Issue | Type | Location / Notes |
|---|-------|------|------------------|
| 1 | **Auth init 30s timeout** — If Supabase auth takes >30s (slow network, cold start), app resolves with stale/empty state. User can land logged out despite valid tokens, or see wrong subscription. No retry, no "جاري التحقق من الجلسة..." | Code | `src/contexts/AuthContext.tsx` — BROWSER_AUDIT_FINDINGS #1 |
| 2 | **No offline injection logging** — Tracker form fails when offline; no background sync. User logs injection while offline → toast error, data lost. No Workbox Background Sync for `injection_logs` | Code | `src/components/tracker/TrackerForm.tsx`, `src/sw.ts` (no background sync) |

---

## P1 — High Priority

### Code Changes

| # | Issue | Type | Location / Notes |
|---|-------|------|------------------|
| 3 | **Only 5 pages cached offline** — SW `pages-cache` has `maxEntries: 5`, `ExpirationPlugin`. User navigating >5 unique pages offline loses cache for earlier ones. | Code | `src/sw.ts` lines 50–54 |
| 4 | **No dead letter queue for webhooks** — Stripe webhook returns 500 on DB failure so Stripe retries. After max retries, events are lost. No DLQ or manual replay path. | Code | `supabase/functions/stripe-webhook/index.ts`; OPERATIONS.md #48 |
| 5 | **No per-peptide OG images** — All peptide pages use `DEFAULT_OG_IMAGE` (`/og-image.jpg`). api/og.ts returns `image: DEFAULT_OG_IMAGE` for `/peptide/:id`. Poor social sharing (generic image for BPC-157, Semaglutide, etc.) | Code | `api/og.ts` line 185; `src/pages/PeptideDetail.tsx` line 139 |
| 6 | **No notification when protocol cycle ends** — coach-notifications only fires when "cycle ending within 7 days" (`daysRemaining > 0 && daysRemaining <= 7`). When `daysRemaining <= 0` (cycle has ended), no notification. | Code | `supabase/functions/coach-notifications/index.ts` ~212–228 |
| 7 | **Community PurgoMalum only catches English profanity** — `checkProfanity()` calls PurgoMalum API (English). Arabic profanity/slurs not filtered. | Code | `src/pages/Community.tsx` lines 108–112 |
| 8 | **DEFERRED: Google Safe Browsing for community post URLs** — Comment in Community.tsx: "requires server-side API key". Community post URLs are not checked against malicious sites. | Code | `src/pages/Community.tsx` line 50 |
| 9 | **Header `inert` has limited support in older browsers** — TODO: "consider polyfill or fallback for legacy browsers". Drawer may be focusable when closed in Safari <15.5, older Chrome. | Code | `src/components/layout/Header.tsx` line 415 |

### Infrastructure / Manual

| # | Issue | Type | Location / Notes |
|---|-------|------|------------------|
| 10 | **Stripe coupon creation verification** — Coupons `retention_20_pct`, `referral_reward`, `referral_friend_40_second` must exist in Stripe Dashboard. Create-checkout, stripe-webhook, cancel-subscription reference them. | Manual | Stripe Dashboard → Coupons. Verify all three exist and match env vars |
| 11 | **Email deliverability (SPF/DKIM/DMARC)** — Resend domain verification. DNS records must be set per EXTERNAL_SERVICES_CHECKLIST. | Manual | Resend dashboard; DNS for pptides.com |
| 12 | **Google Cloud Console authorized origins** — For Supabase Auth (Google OAuth). Must include `https://pptides.com` and any preview URLs. | Manual | Google Cloud Console → APIs & Services → Credentials → OAuth client |

---

## P2 — Medium Priority

### Code Changes

| # | Issue | Type | Location / Notes |
|---|-------|------|------------------|
| 13 | **Static peptide data requires code deploy** — peptides.ts, peptides-public.ts, peptides-lite.ts are bundled. Adding/editing peptides = code change + deploy. No admin/CMS for protocol content. | Code | `src/data/peptides*.ts`; FOUNDER_RUNBOOK, DEPENDENCY_MAP |
| 14 | **No admin protocol editor** — peptide_protocols table exists; no UI to edit protocol text (dosage_ar, timing_ar, cycle_ar, etc.) without SQL. | Code | Admin.tsx has user management but no protocol CRUD |
| 15 | **Heatmap doesn't differentiate peptides** — TrackerHeatmap shows `day.count` (total injections per day). No per-peptide breakdown; user on BPC-157 + Semaglutide sees merged activity. | Code | `src/components/tracker/TrackerHeatmap.tsx`; heatmapData uses `count` only |
| 16 | **Only one injection reminder per user** — localStorage `pptides_injection_reminder` stores single `{ peptide, nextDate, freqHours }`. User on multiple protocols (e.g. BPC-157 + Ipamorelin) gets only one reminder; overwrites on next log. | Code | `src/components/tracker/TrackerForm.tsx` ~236; `src/pages/Tracker.tsx` ~145 |
| 17 | **Tracker initial load — no toast when fetchError** — User sees empty list with no explanation when injection_logs fetch fails. | Code | BROWSER_AUDIT_FINDINGS #4; `src/pages/Tracker.tsx` |
| 18 | **Dashboard — no user-visible error when injection_logs fails** — useRecentActivity and related hooks only console.error; user may not know data failed. | Code | BROWSER_AUDIT_FINDINGS #4 |
| 19 | **useProactiveCoach — one failing Supabase call kills whole section** — Promise.all of 9 calls; any throw = no proactive cards. | Code | `src/hooks/useProactiveCoach.ts` |
| 20 | **Font preload warning** — `cl.woff2` preloaded but "not used within a few seconds" of load. Console noise, possible wasted bandwidth. | Code | `index.html` or font preload config |
| 21 | **Copy inconsistency (استشارات غير محدودة)** — BROWSER_AUDIT reported "استشارات غير محدودة — لا حد للأسئلة" on live Pricing. Codebase now uses "عدد كبير من الاستشارات اليومية" — verify live deploy is current. | Code / Verify | Pricing.tsx, FAQ, Admin, FeatureComparisonTable, PeptideDetail |

### UX / Minor

| # | Issue | Type | Location / Notes |
|---|-------|------|------------------|
| 22 | **Stacks "ابدأ البروتوكول" flow** — UX_GAPS_REPORT said it linked to Tracker. Code now opens ProtocolWizard (setActiveWizard / setStackStartDialog). Verify UX is correct. | Verify | `src/pages/Stacks.tsx` |
| 23 | **Quiz — no save/share results** — Results stored in localStorage; no "Save results" or "Share to social/PDF" option. | Code | `src/components/PeptideQuiz.tsx`; UX_GAPS_REPORT 77.5 |
| 24 | **Protocol start confirmation** — No explicit "تم تفعيل بروتوكول X" toast after ProtocolWizard completes. | Code | ProtocolWizard |

---

## P3 — Low Priority / Acknowledged

| # | Issue | Type | Location / Notes |
|---|-------|------|------------------|
| 25 | **key={i} in 56 instances** — Acknowledged safe for static/skeleton lists. No reorder, no add/remove. ESLint may flag; acceptable. | N/A | Various components (Skeletons, loading states, etc.) |
| 26 | **npm audit — 30 vulnerabilities** — 5 moderate, 25 high. `npm audit fix --force` breaks Vercel/vite-plugin-pwa. Monitor upstream. | Manual | MANUAL_STEPS_RUNBOOK #4 |
| 27 | **Auth token expires during form fill** — Tracker shows generic "تحقق من اتصالك" not "انتهت الجلسة — سجّل الدخول". User may assume network issue. | Code | Tracker, AuthContext |
| 28 | **Stripe checkout error redirect** — No `payment=error` handling. User could land on /dashboard without success param. | Code | PaymentProcessing |
| 29 | **Edge function calls** — Some lack explicit client timeout; fetch uses browser default. User could wait indefinitely on slow network. | Code | create-checkout, cancel-subscription, etc. |

---

## Summary by Category

| Category | P0 | P1 | P2 | P3 |
|----------|----|----|----|-----|
| **Code** | 2 | 7 | 13 | 4 |
| **Infrastructure** | 0 | 0 | 0 | 0 |
| **Manual verification** | 0 | 3 | 2 | 1 |

---

## Quick Reference: Known Deferred / Documented

- **Google Safe Browsing** (community URLs) — requires server-side API key
- **Per-peptide OG images** — needs dynamic image generation (e.g. @vercel/og, Satori)
- **Background sync for injection logs** — Workbox Background Sync not wired
- **Webhook DLQ** — Stripe retries; no persistent failed-event storage
- **inert polyfill** — FocusTrap handles focus; inert is progressive enhancement

---

## Files to Check for New Issues

- `src/contexts/AuthContext.tsx` — auth init, subscription fetch
- `src/sw.ts` — offline strategy, cache limits
- `supabase/functions/stripe-webhook/index.ts` — error handling, DLQ
- `supabase/functions/coach-notifications/index.ts` — cycle-end logic
- `api/og.ts` — peptide image fallback
- `src/pages/Community.tsx` — PurgoMalum, Safe Browsing

---

*Generated from codebase sweep 2026-03-14. Cross-reference with BROWSER_AUDIT_FINDINGS.md, OPERATIONS.md, MANUAL_STEPS_RUNBOOK.md, docs/archive/AUDIT.md.*
