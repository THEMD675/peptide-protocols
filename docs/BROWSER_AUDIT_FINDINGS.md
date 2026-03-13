# Live Browser Audit — pptides.com (Real User Truth)

**Audit date:** 2026-03-13  
**Scope:** https://pptides.com/ only (no localhost). Browser = source of truth.

---

## 1. Critical: Auth init 30s timeout (CONFIRMED IN BROWSER)

**Console (live):** `Auth init timeout (30s) — resolving with current state`  
**File:** `src/contexts/AuthContext.tsx` (timeout ~line 436)

**What this means for a real user:**
- If Supabase auth (session restore / refresh) takes longer than 30s (slow network, cold start, RLS delay), the app **gives up** and resolves with whatever state it has.
- User can land **logged out** even though they have valid tokens, or see **stale subscription** (e.g. still "free" after paying).
- No retry, no "still loading" — the app just proceeds. That’s a **root cause** of "patchy" behaviour: half-authenticated or wrong tier.

**Root fix (not workaround):**
- Don’t rely on a single 30s hard timeout as "done". Options: retry auth once after timeout, or keep showing a non-blocking "جاري التحقق من الجلسة..." until first definitive result (success or 401).
- Consider shorter timeout (e.g. 15s) with one retry before showing "انتهت الجلسة" so fast networks aren’t stuck 30s.

---

## 2. Copy inconsistency: "استشارات غير محدودة" still on Pricing (LIVE)

**Where:** https://pptides.com/pricing  
**Seen in snapshot:** List item "استشارات غير محدودة — لا حد للأسئلة" (المتقدّمة).

Coach was updated to "عدد أكبر من الاستشارات اليومية"; Pricing and other surfaces were not. Users see **unlimited** in one place and **limited** in another → trust and confusion.

**Root fix:** Single source of truth for tier copy. Search codebase for `غير محدودة` and `بلا حدود` (and any "unlimited" promise) and replace with the real limit or a single phrase used everywhere (e.g. "عدد كبير من الاستشارات اليومية").

**Files to fix (from codebase grep):**
- `src/pages/Pricing.tsx` — feature list + meta/JSON-LD
- `src/pages/PeptideDetail.tsx`, `src/pages/FAQ.tsx`, `src/pages/Admin.tsx`, `src/components/FeatureComparisonTable.tsx`

---

## 3. Font preload warning (CONFIRMED IN BROWSER)

**Console (live):**  
`The resource https://pptides.com/f/cl.woff2 was preloaded using link preload but not used within a few seconds from the window's load event.`

**Impact:** Console noise, possible wasted bandwidth. Not user-visible UX but signals sloppy asset handling.

**Root fix:** Either remove the preload for `cl.woff2` if it’s not used above-the-fold, or ensure it’s actually used within the load window (e.g. on the first paint). Check `index.html` and any component that preloads fonts.

---

## 4. Broken / unreliable fetches (from codebase review — verify in browser)

These are **candidates**; they should be re-checked on live with DevTools (Network + Console) as a real user.

| Location | Issue | Risk |
|----------|--------|------|
| **AuthContext** | `fetchSubscription` fails → after 3 failures subscription is reset to DEFAULT; user can appear free when they’re not. | High |
| **Tracker** | Initial `fetchLogs` sets `fetchError` but no toast; user may see empty list with no explanation until they scroll to history. | Medium |
| **Dashboard** | `useRecentActivity` has 30s timeout then sets error + toast; other hooks (e.g. wellness, protocols) only `console.error` on failure — no user-visible error. | Medium |
| **useProactiveCoach** | `Promise.all` of 9 Supabase calls; if **any** throws, whole thing fails and dashboard cards may not render. No per-query error handling. | Medium |
| **Edge functions** | Several `fetch(.../functions/v1/...)` calls: create-checkout, create-portal-session, ai-coach, cancel-subscription, delete-account. All must check `res.ok` and parse error body; some do, some may not. | High |
| **Account** | `admin-actions` and Stripe sync are fire-and-forget with `.catch(console.error)`; user not told if sync failed. | Low |

---

## 5. Post-checkout / subscription freshness (from prior work)

- PaymentProcessing now calls `refreshSubscription()` and polls — good.
- AuthContext still has a 30s auth init timeout; if the user lands with `?payment=success` and auth is slow, they can still see loading or wrong state. So the **auth timeout** (item 1) is the main remaining root cause for "paid but still loading" or "paid but shown as free".

---

## 6. Recommended order of fixes (root, not patches)

1. **Auth init:** Remove or relax the single 30s "give up" and add retry or persistent "جاري التحقق من الجلسة..." until first success/fail. Prevents half-auth and wrong subscription on slow networks.
2. **Copy:** One pass to replace every "غير محدودة" / "بلا حدود" with the real limit or one shared phrase (Pricing, FAQ, Admin, FeatureComparisonTable, PeptideDetail).
3. **Font preload:** Fix or remove `cl.woff2` preload so it’s either used or not preloaded.
4. **Error surfacing:** Tracker initial load — show toast or inline message when `fetchError` is true so user doesn’t see empty state with no explanation. Dashboard — ensure at least one user-visible error when critical data (e.g. injection_logs) fails.
5. **useProactiveCoach:** Make the dashboard resilient: handle per-query failure (e.g. return partial data + error flag) so one failing Supabase call doesn’t kill the whole proactive section.
6. **Edge function calls:** Audit every `fetch(.../functions/v1/...)` and ensure: `if (!res.ok)` → read body, show user-facing message, no silent fail.

---

## 7. How to re-run this audit (real user only)

1. Open https://pptides.com/ in a clean profile or incognito.
2. Open DevTools → Network (preserve log), Console.
3. Sign up or log in → go to Dashboard → Tracker → Coach → Pricing → Account (billing).
4. Note every red request (4xx/5xx), every console error, and every UI state that doesn’t match expectation (e.g. "اشتراكك مفعّل" vs still showing trial banner).
5. Compare with this doc and update findings; then fix at **root** (auth, copy, error handling), not with one-off UI patches.
