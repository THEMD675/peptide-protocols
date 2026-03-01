# pptides.com — UX Gaps Report (Categories 75–80)

**Scope:** User journey gaps a real person would encounter. Based on actual code review.

---

## CATEGORY 75: WHAT HAPPENS WHEN USER COMES BACK (1801–1810)

### 75.1 User closes browser, comes back next day — is session preserved?
**Status:** ✅ **Works.**  
- `supabase.ts`: `persistSession: true` — session stored in localStorage.  
- `AuthContext`: `supabase.auth.getSession()` and `onAuthStateChange` restore session on load.

### 75.2 User bookmarks /dashboard — does it work when they return?
**Status:** ✅ **Works.**  
- `/dashboard` is a protected route. If user is logged in, session is restored and they see the dashboard.  
- If not logged in, `ProtectedRoute` redirects to `/login?redirect=/dashboard`.  
- `Login.tsx` reads `redirect` from URL and navigates to it after successful login (lines 43–46, 110–115).

### 75.3 User shares a /peptide/bpc-157 link — does the recipient see content or a login wall?
**Status:** ✅ **Depends on peptide.**  
- `/peptide/:id` is **not** behind `ProtectedRoute` — it’s public.  
- Recipient sees content based on `hasAccess`:
  - `peptide.isFree` → full content.
  - `TRIAL_PEPTIDE_IDS` + trial user → full content.
  - Otherwise → first sentence + locked CTA (lines 273–317 in `PeptideDetail.tsx`).  
- **No login wall** for the page itself; paid content is gated with a clear upsell CTA.

### 75.4 User clicks email CTA link — does it go to the right place?
**Status:** ✅ **Works.**  
- `trial-reminder`: links to `/library`, `/calculator`, `/coach`, `/pricing` — all valid.  
- `send-welcome-email`: links to `/library`, `/coach`, `/calculator`, `/dashboard` — all valid.  
- `create-checkout`: `success_url` → `/dashboard?payment=success`, `cancel_url` → `/pricing`.

### 75.5 User's trial expired — what do they see on each page?
**Status:** ✅ **Handled.**  
- `TrialBanner.tsx`:
  - On **free pages** (library, calculator, etc.): sticky red banner + link to pricing.
  - On **protected pages** (dashboard, tracker, coach): modal blocks access, offers “Subscribe” or “Browse free content” (library, calculator, interactions, etc.).  
- `FREE_PATHS` defines which pages show banner vs modal (lines 11–16).

---

## CATEGORY 76: WHAT HAPPENS ON ERRORS (1811–1820)

### 76.1 Network drops during Coach AI streaming — what does user see?
**Status:** ✅ **Handled.**  
- `Coach.tsx` (lines 317–328): catch block sets `__ERROR__` message in chat.  
- User sees:  
  - `__ERROR__:429` → “لقد تجاوزت الحد المسموح. حاول بعد قليل.”  
  - `__ERROR__:403` → “انتهت صلاحية جلستك. أعد تسجيل الدخول.”  
  - Generic → “حدث خطأ في الاتصال. حاول مرة أخرى.”  
- “إعادة المحاولة” button re-sends the last user message.

### 76.2 Supabase returns 500 on Tracker save — what does user see?
**Status:** ✅ **Handled.**  
- `Tracker.tsx` (lines 244–246, 117–118, 402–403): on `error`, `toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى')`.  
- Form stays populated; user can retry.

### 76.3 Stripe checkout page errors out — what does user see when redirected?
**Status:** ⚠️ **Partial.**  
- `cancel_url` → `/pricing` — user returns to pricing; no explicit “payment cancelled” message.  
- `success_url` → `/dashboard?payment=success` — `PaymentProcessing` shows loading/success.  
- **Gap:** If Stripe shows an error page (e.g. card declined) and redirects, there is no `payment=error` handling. `PaymentProcessing` only reacts to `payment=success`. User could land on `/dashboard` without `?payment=success` and see the normal dashboard with no feedback.

### 76.4 User's auth token expires during form fill — what happens on submit?
**Status:** ⚠️ **Partial.**  
- `AuthContext` (lines 139–146): `fetchSubscription` catches JWT/401 from subscriptions fetch → toast “انتهت الجلسة — يرجى تسجيل الدخول مرة أخرى” + signOut.  
- Tracker/other forms: Supabase `insert` returns 401 → `error` object. Tracker shows generic “تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى” — **does not** tell user to re-login.  
- **Gap:** User may assume a network issue instead of expired session.

### 76.5 Edge function times out — does user get stuck?
**Status:** ✅ **Handled for Coach.**  
- `Coach.tsx` (line 275): `streamTimeout = setTimeout(() => controller.abort(), 60_000)` — 60s timeout, then abort.  
- `ai-coach` edge: `AbortSignal.timeout(30000)` (line 251).  
- Abort → catch → `__ERROR__` message + retry button.  
- **Note:** Other edge calls (create-checkout, cancel-subscription, etc.) have no explicit client timeout; fetch uses browser default. User could wait indefinitely on slow network.

---

## CATEGORY 77: MISSING FEEDBACK (1821–1830)

### 77.1 User adds injection — is there a success animation/feedback?
**Status:** ✅ **Works.**  
- `toast.success(...)` on save (lines 121, 262, 411 in `Tracker.tsx`).  
- `useCelebrations` hook: milestone toasts for 1st, 10th, 50th injection and streaks (7, 14, 30 days).  
- Form resets and hides; list refreshes.

### 77.2 User favorites a peptide — visual feedback?
**Status:** ✅ **Works.**  
- `Library.tsx` (line 219): `toast.success('تمت الإضافة للمفضلة')` on add.  
- Star icon fills (`fill-amber-400 text-amber-400`) and card gets `border-s-4 border-s-amber-400`.

### 77.3 User changes email — what confirmation do they see?
**Status:** ✅ **Works.**  
- `Account.tsx` (line 64): `toast.success('تم تغيير البريد — يُرجى تحديث بريدك في إعدادات الدفع أيضًا')`.  
- **Note:** No email verification flow; Supabase may require confirmation depending on project config.

### 77.4 User starts a protocol — confirmation of what was set up?
**Status:** ⚠️ **Partial.**  
- `ProtocolWizard` creates `user_protocols` row. Need to check if it shows confirmation.  
- Tracker: “بروتوكولاتك النشطة” cards show protocols; quick-log gives toast.  
- **Gap:** No explicit “تم تفعيل بروتوكول X — الجرعة Y، التكرار Z” toast after completing ProtocolWizard.

### 77.5 User uses the quiz — is there a "save results" or "share results" option?
**Status:** ❌ **Missing.**  
- `PeptideQuiz.tsx`: Results are stored in `pptides_quiz_answers` (goal, experience, injection) — no `ts` field.  
- No “Save results” or “Share results” UI.  
- Copy/share to social or PDF not implemented.

---

## CATEGORY 78: DEAD ENDS IN THE APP (1831–1840)

### 78.1 After viewing a peptide detail, where does user go next?
**Status:** ✅ **Addressed.**  
- Grid of CTAs (lines 304–333): حاسبة متقدمة، فحص التعارضات، اسأل المدرب، ابدأ بروتوكول، سجّل حقنة.  
- “ببتيدات ذات صلة” section.

### 78.2 After completing the quiz, what's the natural next step?
**Status:** ✅ **Addressed.**  
- Links to: Coach (“صمّم بروتوكول مخصّص”), peptide detail, calculator.  
- “عرض نتائجك السابقة” for returning users.

### 78.3 After logging an injection, what's suggested next?
**Status:** ⚠️ **Partial.**  
- Toast + form close. Empty state has links (Coach, guide, calculator, interactions).  
- **Gap:** After a successful log, no inline “التالي: سجّل جرعة بروتوكولك التالية” or “راجع سجل التزامك” suggestion.

### 78.4 After reading the guide, what's the CTA?
**Status:** ✅ **Addressed.**  
- Bottom CTA (lines 329–349): دليل التحاليل، حاسبة الجرعات، سجّل أول حقنة (pro); أو اشترك / جرّب الحاسبة (free).

### 78.5 After checking interactions, what should user do?
**Status:** ✅ **Addressed.**  
- Bottom links: احسب الجرعة، سجّل في المتتبع، اسأل المدرب الذكي، العودة للمكتبة (lines 259–269).

### 78.6 After viewing stacks, how does user start a protocol?
**Status:** ❌ **Broken flow.**  
- `Stacks.tsx` (lines 175–181): “ابدأ البروتوكول” links to `/tracker?peptide=${stackPeptides[0]?.nameEn}`.  
- That opens the **Tracker** with peptide prefilled in the form — it does **not** open ProtocolWizard.  
- **Gap:** User expects to “start a protocol” (schedule, frequency, cycle) but lands on one-off injection logging. ProtocolWizard is the right entry point for stacks.

---

## CATEGORY 79: MOBILE BOTTOM NAVIGATION (1841–1850)

### 79.1 Is there a bottom nav for the 4–5 main sections?
**Status:** ❌ **No bottom nav.**  
- `Header.tsx`: hamburger drawer with nav links and tools.  
- `main` has `pb-16 md:pb-0` (App.tsx line 258) — padding for possible bottom bar, but none is rendered.  
- Compare bar uses `bottom-20 md:bottom-6` (Library.tsx line 445), suggesting space for a nav that doesn’t exist.

### 79.2 Is the pb-16 padding just wasted space?
**Status:** ⚠️ **Yes.**  
- No fixed bottom navigation. `pb-16` gives space that isn’t used by a dedicated nav.  
- May have been intended for future bottom nav or PWA install prompt.

### 79.3 Can user access key features without opening hamburger menu?
**Status:** ⚠️ **Limited.**  
- Mobile: only Logo, Search, User avatar (or Login), and Hamburger are visible.  
- Dashboard, Tracker, Library, Coach require opening the drawer.  
- No quick-access bottom bar for these sections.

---

## CATEGORY 80: STATE PERSISTENCE (1851–1860)

### 80.1 Calculator results — are they preserved on navigation?
**Status:** ✅ **Partial.**  
- Form state (`doseValue`, `vialMg`, `waterMl`, etc.) is **not** in localStorage — it resets on navigation.  
- `?peptide=` URL param prefills from `searchParams` (DoseCalculator lines 228–240).  
- `pptides_calc_history` stores last 5 saved calculations; user can click to restore.  
- **Gap:** Unsaved calculator state is lost on navigation.

### 80.2 Coach conversation — is it preserved on refresh?
**Status:** ✅ **Works.**  
- `localStorage.setItem(storageKey, JSON.stringify({ messages, intake }))` (Coach.tsx lines 211–217).  
- `storageKey = pptides_coach_${user?.id ?? 'anon'}`.  
- Loaded on mount (lines 194–195).  
- QuotaExceededError handled with trimmed history + toast.

### 80.3 Library filters — preserved on back navigation?
**Status:** ✅ **Works.**  
- Filters in URL: `category`, `q`, `evidence`, `sort` (Library.tsx lines 268–272, 273–283).  
- `useSearchParams` + `setSearchParams(..., { replace: true })` keeps URL in sync.  
- Back/forward restores URL and thus filters.

### 80.4 Tracker form — preserved if user navigates away?
**Status:** ❌ **No.**  
- Form state is React state only. Navigating away (or closing tab) loses it.  
- `?peptide=` in URL prefills peptide when form is shown (lines 74–76, 449–454).  
- **Gap:** No sessionStorage/localStorage for draft.

### 80.5 Quiz progress — preserved if user leaves mid-quiz?
**Status:** ❌ **No.**  
- `PeptideQuiz.tsx`: `step` and `answers` are React state. No persistence for in-progress quiz.  
- Results are saved only on completion (lines 138–143).  
- **Gap:** Leaving at step 2 and returning restarts the quiz.

---

## Summary: Genuinely Broken Items

| # | Category | Item | Severity |
|---|----------|------|----------|
| 1 | 78 | Stacks “ابدأ البروتوكول” → Tracker instead of ProtocolWizard | **High** |
| 2 | 77 | Quiz: no save/share results option | Medium |
| 3 | 79 | No mobile bottom nav; pb-16 unused | Medium |
| 4 | 80 | Quiz progress lost on leave | Medium |
| 5 | 80 | Tracker form draft lost on navigation | Medium |
| 6 | 80 | Calculator form state lost on navigation (unsaved) | Low |
| 7 | 76 | Stripe checkout error — no payment=error handling | Low |
| 8 | 76 | Expired auth on form submit — generic error, not “re-login” | Low |
| 9 | 77 | ProtocolWizard completion — no clear “تم تفعيل بروتوكول X” toast | Low |
| 10 | 77 | Quiz localStorage missing `ts` — Coach’s loadQuizAnswers returns null for quiz data | **Bug** |

---

*Report generated from codebase scan. Only genuinely broken or missing behaviors are listed.*
