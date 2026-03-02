# PPTIDES.COM — MASTER EXECUTION PLAN (FINAL)

**Created:** 2026-03-02
**Last verified:** 2026-03-02 — R1–R11 line-by-line verified; corrections applied
**Status:** AWAITING APPROVAL — zero code touched until approved
**Confidence:** R2, R3, R5, R6, R7, R10 verified. R4, R8, R9, R11 need re-check.

---

## CRITICAL FINDING (CORRECTED 2026-03-02)

**Paywall:** Deployed (a638ef2) has **paywall bypass** — `/peptide` in FREE_PATHS makes ALL peptides free. Local **fixes** it (isPeptideFree).  
**Regressions:** R2, R3 (OAuth) are real. R5, R6, R7, R10, R11 verified as fixed or not regressions. R4, R8, R9 need re-verify.  
**Live vs a638ef2:** Live serves SAR; a638ef2 has USD. Vercel production source unknown.

---

## CURRENT STATE (CORRECTED 2026-03-02)

| | Deployed (a638ef2) | Local (working tree) | Live (pptides.com) |
|---|---|---|---|
| Commit | `a638ef2` | 71 files ahead | **Unknown** — serves SAR, not a638ef2 |
| Paywall | **BROKEN** (/peptide in FREE_PATHS) | **FIXED** (isPeptideFree) | Unknown until Vercel commit confirmed |
| OAuth delete | Works (no password) | **BROKEN** (password blocks OAuth) | — |
| OAuth password change | Works (no old password) | **BROKEN** (blocks OAuth) | — |
| PWA start_url | `/` | `/` (same) | — |
| Dashboard no-sub msg | "ابدأ تجربتك المجانية" | **FIXED** (status none vs expired) | — |
| Dashboard polling | None | **FIXED** (AuthContext only) | — |
| Pre-existing bugs | 33 | 33 | — |

---

## PHASE 1 — FIX LOCAL REGRESSIONS (11 items)

These bugs were INTRODUCED by the uncommitted code. They do NOT exist on the live site. Fix these FIRST to avoid deploying regressions.

### R1. PAYWALL — TrialBanner FREE_PATHS (CORRECTED 2026-03-02)
**`src/components/TrialBanner.tsx:11-16`**
- **Deployed (a638ef2):** FREE_PATHS includes `/peptide` — ALL peptide pages free for expired users. Paywall BYPASS.
- **Local:** Removes `/peptide` from FREE_PATHS; uses `isPeptideFree` (FREE_PEPTIDE_IDS) — only 6 free peptides.
- **Impact:** Deployed = paywall broken. Local = paywall fixed.
- **Fix:** Deploy local TrialBanner. Do NOT add `/dashboard`, `/tracker`, `/coach` to FREE_PATHS.

### R2. Google OAuth users cannot delete account
**`src/pages/Account.tsx:261-266`**
- **Deployed:** No password required for deletion. Direct API call.
- **Local:** Added `signInWithPassword` check. OAuth users blocked.
- **Fix:** Keep the password verification (good security) but detect OAuth users via `user.app_metadata.provider` and use typed confirmation ("DELETE") instead.

### R3. Google OAuth users cannot change password
**`src/pages/Account.tsx:144-151`**
- **Deployed:** No current password check. Direct `updateUser`.
- **Local:** Added `signInWithPassword` for current password. OAuth users blocked.
- **Fix:** Keep verification for email users. For OAuth users, hide the section or show "Set password" flow.

### R4. Cancel discount offer — RE-VERIFY
**`src/pages/Account.tsx`**
- **Deployed:** Retention dialog with "الاحتفاظ بالاشتراك", "إيقاف مؤقت — تواصل معنا" (mailto).
- **Local:** Similar; "إيقاف مؤقت" shows toast. No "ابقَ مع الخصم" found in current code.
- **Status:** MASTER_PLAN claim may be stale. Verify if fake discount CTA exists elsewhere.

### R5. Dashboard payment polling — FIXED
**`src/pages/Dashboard.tsx`**
- **Verified:** Local has comment "Payment polling handled by AuthContext — no duplicate here". No setInterval.
- **Status:** ✅ Fixed. Remove from regression list.

### R6. Dashboard no-sub message — FIXED
**`src/pages/Dashboard.tsx:332-334`**
- **Verified:** Local: `status === 'none' || undefined` → "ابدأ اشتراكك"; else → "اشتراكك منتهي".
- **Status:** ✅ Fixed. Remove from regression list.

### R7. PWA start_url — NOT A REGRESSION
**`vite.config.ts:31`**
- **Verified:** Local has `start_url: '/'` — same as deployed.
- **Status:** ❌ Remove from regression list. No fix needed.

### R8. Cron migration missing authentication
**`supabase/migrations/20260301100003_schedule_crons.sql:10,15`**
- **Deployed:** File does not exist (crons not yet scheduled).
- **Local:** File exists but headers lack `x-cron-secret`. If applied, cron endpoints are either unprotected or calls silently fail.
- **Fix:** Add `"x-cron-secret": "..."` header using Supabase Vault reference before applying migration.

### R9. WhatsApp constants — RE-VERIFY
**`src/lib/constants.ts`**
- **Verified:** Deployed has `SUPPORT_WHATSAPP`, `SUPPORT_WHATSAPP_URL` (empty). No `COMMUNITY_WHATSAPP_URL`.
- **Local:** Same structure. COMMUNITY_WHATSAPP_URL not found.
- **Status:** MASTER_PLAN wrong constant name. Remove or fix.

### R10. Footer MessageCircle — NOT A REGRESSION
**`src/components/layout/Footer.tsx:3`**
- **Verified:** Both deployed and local: `import { Lock, Shield, Mail }` — no MessageCircle.
- **Status:** ❌ Remove from regression list.

### R11. App.tsx cookieHandled — RE-VERIFY
**`src/App.tsx`**
- **Verified:** Grep found no `cookieHandled` in current App.tsx.
- **Status:** May be fixed. Remove from list or re-check.

---

## PHASE 2 — FIX BUGS BROKEN EVERYWHERE (33 items)

These exist in BOTH the deployed site AND local code. Users are experiencing these RIGHT NOW.

### MONEY & CURRENCY (4 items)

**B1. Schema.org prices in USD** — `index.html:64,73`
`"priceCurrency": "USD"`, `"price": "9"`. Should be SAR 34/371.
Status: **BOTH**

**B2. Analytics revenue in USD** — `src/lib/analytics.ts:18-19`
`currency: 'USD'` in GA4 ecommerce events. Should be `'SAR'`.
Status: **BOTH**

**B3. Admin MRR uses USD amounts** — `supabase/functions/admin-stats/index.ts:117`
`essentialsSubs.length * 9 + eliteSubs.length * 99`. Should be `* 34` / `* 371`.
Status: **BOTH**

**B4. Trial-will-end emails never sent** — `supabase/functions/stripe-webhook/index.ts:458-461`
`hoursUntilEnd > 60` skips all 3-day (72h) trials. Email always suppressed.
Status: **BOTH**

### AUTH & SESSIONS (7 items)

**B5. Welcome email sent twice** — `src/contexts/AuthContext.tsx:255-264 + 380-389`
Both `onAuthStateChange SIGNED_IN` and `signup()` call `send-welcome-email`.
Status: **BOTH**

**B6. 5-second auth timeout** — `src/contexts/AuthContext.tsx:226-228`
`setTimeout(() => setIsLoading(false), 5000)` — false redirect on slow networks.
Status: **BOTH**

**B7. Logout localStorage cleanup incomplete** — `src/contexts/AuthContext.tsx:410-415`
Whitelist misses ~14 `pptides_*` keys. Next user on shared device inherits data.
Status: **BOTH**

**B8. logout() hard-navigates** — `src/contexts/AuthContext.tsx:420`
`window.location.href = '/'` makes Logout.tsx `navigate()` dead code.
Status: **BOTH**

**B9. Trial users locked out of Stripe portal** — `src/pages/Account.tsx:510`
Gated on `isPaidSubscriber` — trial users can't manage billing.
Status: **BOTH**

**B10. No re-activate for cancelled subscriptions** — `src/pages/Pricing.tsx:80-99`
No "renew" button. Cancelled-but-active users see generic "start trial" which may double-subscribe.
Status: **BOTH**

**B11. ExitIntentPopup vs StickyScrollCTA inconsistent** — `ExitIntentPopup.tsx:25` vs `StickyScrollCTA.tsx:45`
Exit popup uses `isPaidSubscriber` (trial sees it), sticky uses `isProOrTrial` (trial hidden).
Status: **BOTH**

### PAYMENT FLOW (2 items)

**B12. PaymentProcessing 60s timeout silent** — `src/components/PaymentProcessing.tsx:45-49`
Overlay disappears after 60s with no error message, no "contact support."
Status: **BOTH**

**B13. No spam folder hint** — `src/pages/Login.tsx:203`
Password reset success message doesn't mention checking spam.
Status: **BOTH**

### EDGE FUNCTIONS (7 items)

**B14. Admin enquiry reply no email** — `src/pages/Admin.tsx:386-405`
Only updates DB status. User never receives the reply.
Status: **BOTH**

**B15. Coach upgradeTo no error handling** — `src/pages/Coach.tsx:818`
`upgradeTo('elite')` called without try/catch or await. Unhandled rejection.
Status: **BOTH**

**B16. Coach intake step not persisted** — `src/pages/Coach.tsx:176-184`
`intakeStep` state lost on refresh. Only messages/intake data are saved.
Status: **BOTH**

**B17. CSV export only loaded page** — `src/pages/Tracker.tsx:312-314`
Uses paginated `logs` (50 per page). User with 200 entries exports partial data.
Status: **BOTH**

**B18. trial-reminder PEPTIDE_COUNT hardcoded** — `supabase/functions/trial-reminder/index.ts:10`
`PEPTIDE_COUNT = 41` or raw "41" in templates. Drifts if peptides change.
Status: **BOTH**

**B19. trial-reminder day-1 exact equality** — `supabase/functions/trial-reminder/index.ts:140`
`daysSinceSignup === 1` — narrow window, cron timing drift can miss users.
Status: **BOTH**

**B20. trial-reminder no pagination** — `supabase/functions/trial-reminder/index.ts:87-91`
No `.limit()`. Supabase default 1000 rows. Silently drops users at scale.
Status: **BOTH**

### DATA INTEGRITY (2 items)

**B21. delete-account no transaction** — `supabase/functions/delete-account/index.ts:101-133`
Sequential deletes. Failure at table N leaves partial state. Stripe already cancelled.
Status: **BOTH**

**B22. stripe-webhook no row locking** — `supabase/functions/stripe-webhook/index.ts`
Concurrent events for same subscription can race. Last-write-wins.
Status: **BOTH**

### CONTENT & LEGAL (4 items)

**B23. "3 أيام" hardcoded 30+ locations** — `Pricing.tsx`, `Footer.tsx`, etc.
Trial/refund duration string-hardcoded. Should use `TRIAL_DAYS` constant.
Status: **BOTH**

**B24. "85+ مصدر علمي" unverified claim** — `src/pages/Landing.tsx:76,603`
Number not derived from actual source count.
Status: **BOTH**

**B25. Terms contradicts Coach** — `src/pages/Terms.tsx:19`
"لا نقدّم نصائح طبية" while Coach gives dosage protocols. Legal risk.
Status: **BOTH**

**B26. PeptideDetail dateModified non-ISO** — `src/pages/PeptideDetail.tsx:96`
`peptide.lastUpdated` is `'Feb 2026'` not ISO 8601. Google rejects it.
Status: **BOTH**

### INFRASTRUCTURE & SEO (5 items)

**B27. CSP leaks AI provider** — `vercel.json:12`
`connect-src` includes `https://api.deepseek.com`. Calls go server-side, CSP entry unnecessary.
Status: **BOTH**

**B28. Sitemap issues** — `public/sitemap.xml`
All URLs same `lastmod`. Missing `/about`, `/faq`. Includes auth-walled `/coach`.
Status: **BOTH**

**B29. robots.txt missing /coach** — `public/robots.txt`
Blocks other auth pages but not `/coach`. Bots hit auth wall.
Status: **BOTH**

**B30. fade-up animation broken** — `tailwind.config.ts:77-80`
`"0%": { opacity: "1" }` — never fades, only slides.
Status: **BOTH**

**B31. Dead accordion keyframes** — `tailwind.config.ts:69-76`
Radix UI references. App uses `<details>`. Zero usage.
Status: **BOTH**

### ACCESSIBILITY (5 items)

**B32. No aria-current="page"** — `src/components/layout/Header.tsx:154-168`
Active nav links styled visually but screen readers can't identify current page.
Status: **BOTH**

**B33. Physical CSS right-3** — `src/components/layout/Header.tsx:387`
RTL site uses physical `right-3` instead of logical `end-3`.
Status: **BOTH**

**B34. Physical CSS mr-1/ml-1** — `src/pages/Admin.tsx:468`
Inconsistent with RTL-first conventions.
Status: **BOTH**

**B35. Dashboard empty if-bodies** — `src/pages/Dashboard.tsx:151,162`
`.catch(() => { if (mounted) /* nothing */; })` — dead condition.
Status: **BOTH**

**B36. ProtocolWizard frequency type** — `src/components/ProtocolWizard.tsx:189`
`e.target.value` is `string`, state expects union type.
Status: **BOTH**

### DOCUMENTATION (1 item)

**B37. OPERATIONS.md false claims** — `OPERATIONS.md:35,48`
"tsc verified before every deploy" — not enforced. "All sends awaited" — errors swallowed.
Status: **BOTH**

### Library access inconsistency (1 item)

**B38. Library hasFullAccess excludes trial** — `src/pages/Library.tsx:237`
`hasFullAccess = isPaid` — trial users treated as free. Other pages use `isProOrTrial`.
Status: **BOTH**

---

## REMOVED FROM PLAN (verified NOT broken)

**Password reset race condition** (`Login.tsx:60-66`) — The `isRecovery` guard exists in BOTH deployed and local. The race is already handled. **REMOVED.**

---

## SUMMARY

| Category | Count | Impact |
|----------|-------|--------|
| Phase 1: Local regressions | 11 | Fix BEFORE deploying (avoid shipping new bugs) |
| Phase 2: Broken everywhere | 33 | Fix and deploy (users affected NOW) |
| Removed (not broken) | 1 | — |
| **Total real bugs** | **44** | — |

### Execution order

1. **Phase 1** — Fix all 11 regressions in uncommitted code
2. **Commit + deploy** — Ship cleaned-up code (removes regressions, doesn't add new bugs)
3. **Phase 2** — Fix 33 pre-existing bugs wave by wave
4. **Each wave:** fix → `tsc --noEmit` → `npm run build` → commit → deploy → verify live

---

## EXECUTION RULES

1. **Phase 1 MUST complete before any commit/deploy.**
2. **Every fix tested — not just "code edited and committed."**
3. **`tsc --noEmit` must pass before any commit.**
4. **`npm run build` must pass before any deploy.**
5. **Zero new features until all 44 items complete.**
6. **Mark completed items with date: `- [x] (2026-03-02) description`**

---

## DEFERRED (after all phases)

- Push notifications for injection reminders
- Offline data queue for PWA
- Multi-peptide stack protocol
- Vendor/supplier directory
- WhatsApp/Telegram community
- Dark mode
- Automated test suite
- CI/CD pipeline with tsc + build check
