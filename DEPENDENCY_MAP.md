# pptides — Dependency Map & Blast Radius

**Rule:** Treat every change as potentially breaking something else. Before editing any file, check this map and run verification.

---

## 1. TRIAL_DAYS (3) — CRITICAL, 8+ LOCATIONS

Changing trial duration requires **all** of these to stay in sync:

| File | What to update |
|------|----------------|
| `src/config/trial.ts` | `TRIAL_DAYS = 3` (single source for frontend) |
| `vite.config.ts` | Imports trial.ts, injects `%TRIAL_DAYS%` into index.html |
| `index.html` | Uses `%TRIAL_DAYS%` in meta description, OG tags |
| `supabase/functions/create-checkout/index.ts` | `trial_period_days: 3` (line ~147) |
| `supabase/functions/stripe-webhook/index.ts` | `const TRIAL_DAYS = 3` + email template |
| `supabase/functions/trial-reminder/index.ts` | `const TRIAL_DAYS = 3` + email templates |
| `supabase/functions/send-welcome-email/index.ts` | `3 * 86400000` (ms) + email copy |
| `supabase/functions/admin-actions/index.ts` | `3 * 86400000` in grant_sub flow |

**Consumers of TRIAL_DAYS (via constants):** Landing, FAQ, About, Reviews, Terms, StickyScrollCTA, OnboardingModal, Pricing, ExitIntentPopup, Footer.

---

## 2. peptides.ts — HIGH RISK, 20+ CONSUMERS

**Path:** `src/data/peptides.ts`

**Derived in constants.ts:**
- `FREE_PEPTIDE_IDS` — from `peptides.filter(p => p.isFree)`
- `PEPTIDE_COUNT` — `peptides.length`
- `PUBMED_SOURCE_COUNT`, `PUBMED_SOURCE_LABEL` — from peptide pubmedIds

**Direct consumers:** Header (dynamic import for search), Coach, Dashboard, Library, PeptideDetail, PeptideTable, DoseCalculator, Tracker, Community, Landing, Stacks, Sources, LabGuide, InteractionChecker, ProtocolWizard, BaselineChecklist, PeptideQuiz, SideEffectLog.

**If you change peptides.ts:**
- Check that `isFree` changes don’t desync FREE_PEPTIDE_IDS
- Check that additions/removals don’t break PEPTIDE_COUNT displays
- Run `npm run type-check` — many components use `Peptide` type
- Edge functions may use PEPTIDE_COUNT via env override (trial-reminder) — see OPERATIONS

---

## 3. constants.ts — HIGH RISK, 25+ CONSUMERS

**Path:** `src/lib/constants.ts`

**Imports:** peptides, trial.ts (re-exports TRIAL_DAYS)

**Exports used across app:**
- `PRICING`, `PEPTIDE_COUNT`, `TRIAL_DAYS`, `SITE_URL`, `SUPPORT_EMAIL`
- `FREE_PEPTIDE_IDS`, `TRIAL_PEPTIDE_IDS` — gate Library/PeptideDetail access
- `STORAGE_KEYS` — used by AuthContext, Coach, Dashboard, Landing
- `FREQUENCY_LABELS`, `STATUS_LABELS`, `TIER_LABELS`
- `VALUE_*`, `LEGAL_LAST_UPDATED`, `USD_TO_SAR`, `PUBMED_SOURCE_LABEL`

**Blast radius:** Almost every page and layout component. Renaming or removing an export will break imports.

---

## 4. AuthContext — MEDIUM-HIGH RISK

**Path:** `src/contexts/AuthContext.tsx`

**Provides:** user, subscription, isLoading, login, logout, signUp, fetchSubscription, etc.

**Consumers:** App, Header, BottomNav, ProtectedRoute, TrialBanner, Coach, Dashboard, Account, Login, Pricing, Library, PeptideDetail, Admin, many pages that gate content by `subscription.isProOrTrial`.

**If you change AuthContext:**
- Check ProtectedRoute, TrialBanner, Coach (anon→user migration), create-checkout redirect flow
- Referral flow depends on AuthContext + create-checkout + stripe-webhook

---

## 5. Coach.tsx — MEDIUM RISK

**Path:** `src/pages/Coach.tsx`

**Dependencies:** AuthContext (anon session migration), peptides, constants, ai-coach edge function, localStorage (STORAGE_KEYS.COACH_HISTORY_PREFIX).

**If you change Coach:** Verify anon→user migration, session persistence, and ai-coach request/response shape.

---

## 6. Edge Functions ↔ Frontend Contract

| Edge function | Frontend caller | Contract |
|---------------|-----------------|----------|
| ai-coach | Coach.tsx | Request: { messages, userId?, referralCode? }; streamed response |
| create-checkout | Pricing, Account | Request: { priceId, successUrl, cancelUrl, referralCode? }; returns { url } |
| stripe-webhook | Stripe (not frontend) | Subscriptions table, emails |
| trial-reminder | Cron | None (internal) |
| send-welcome-email | Auth trigger / manual | None (internal) |

**Changing request/response shapes breaks the caller.**

---

## 7. CookieConsent — LOW RISK ✅ FIXED

**Path:** `src/components/CookieConsent.tsx`

- `hasOptionalConsent`, `getCookiePreferences` moved to `src/lib/cookie-utils.ts` (App, main import from there)
- Component: lazy-loaded in App. Now in separate chunk.

---

## 8. Pre-Edit Checklist

Before changing any file in `src/`, `supabase/functions/`, or config:

1. **Grep for imports:** `rg "from '@/path/to/file'" src/` — see who consumes it.
2. **Check this map** — if the file is listed, read the blast radius.
3. **TRIAL_DAYS:** If changing trial duration, update all 8 locations (section 1).
4. **peptides / constants:** Run `npm run type-check` and `npm run build` after edit.
5. **Edge functions:** Ensure request/response shape matches frontend; redeploy function after change.
6. **Final verification:** `npm run predeploy` before commit.

---

## 9. Quick Reference — Files That Touch Many Others

| File | Consumers (approx) |
|------|--------------------|
| `src/data/peptides.ts` | 20+ |
| `src/lib/constants.ts` | 25+ |
| `src/contexts/AuthContext.tsx` | 15+ |
| `src/config/trial.ts` | constants.ts, vite.config, index.html, 5 edge functions |
| `src/App.tsx` | Routes, lazy chunks, ErrorBoundary — changing routes breaks navigation |

---

*Last updated: 2026-03-02. Keep this in sync when adding new shared modules or constants.*
