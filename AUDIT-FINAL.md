# Final Bug Audit — pptides.com

**Scope:** Patterns 1–7, bugs that still exist after 77+ fixes.  
**Date:** 2025-03-01

---

## 1. Timezone Bugs

**No critical timezone bugs found.** Date handling appears correct:
- `logged_at` stored as ISO (UTC); `new Date(iso).toDateString()` uses user local for "today" checks.
- Protocol `daysSinceStart` uses `Date.now() - startDate.getTime()` (UTC ms), timezone-safe.
- `trialDaysLeft` uses `Math.ceil((trialEndsAt - now) / 86400000)` on epoch ms.
- Tracker `injectedAt` initial value uses the `setMinutes(getMinutes() - getTimezoneOffset())` hack correctly for datetime-local.

---

## 2. Number Formatting for Arabic

| File | Line | Code | Issue | Severity |
|------|------|------|-------|----------|
| `src/components/charts/AdherenceBar.tsx` | 15, 26 | `{percent}%`, `{actual} من ${scheduled}` | Numbers shown as Western digits (no `toLocaleString('ar')`) | **Low** — inconsistent with `reviews.length.toLocaleString('ar')` on Reviews |
| `src/pages/Dashboard.tsx` | 340, 349, 508, 513, 518 | `{daysLeft}`, `{activity.streak}`, `{activity.totalInjections}` | Raw numbers, no Arabic locale | **Low** |
| `src/pages/Pricing.tsx` | 206, 243 | `{PRICING.essentials.monthly}`, `{PRICING.elite.monthly}` | Prices "9" and "99" without Arabic numerals | **Low** |
| `src/pages/Reviews.tsx` | 230 | `{averageRating.toFixed(1)}` | Western digits; count uses `toLocaleString('ar')` | **Low** |
| `src/components/ExitIntentPopup.tsx` | 79 | `{subscription.trialDaysLeft}` | Trial days without locale | **Low** |

**Note:** Site uses `ar-u-nu-latn` for dates (Latin numerals). If design intent is Arabic numerals for counts/prices, these should use `toLocaleString('ar')` or `toLocaleString('ar-u-nu-arab')`.

---

## 3. Keyboard/Input Bugs on Mobile

| File | Line | Code | Issue | Severity |
|------|------|------|-------|----------|
| `src/pages/Community.tsx` | 296–304 | `<input id="community-duration" type="number"` | No `inputMode="numeric"` — mobile may show full keyboard | **Medium** |
| `src/components/ProtocolWizard.tsx` | 147–158 | `<input id="wizard-dose" type="number"` | No `inputMode="decimal"` — dose can be decimal | **Medium** |
| Tracker, Community, Reviews forms | — | Form submit | No `(document.activeElement as HTMLElement)?.blur()` after submit — keyboard stays open on mobile | **Low** |

---

## 4. Memory Leaks

**No leaks found.** All `addEventListener`/`setInterval` have matching cleanup. ExitIntentPopup, PaymentProcessing, AuthContext, etc. correctly remove listeners and clear intervals on unmount.

---

## 5. Race Between Router Navigation and State

**No critical races.**  
- `window.location.href =` (AuthContext, ProtocolWizard, PaymentProcessing) causes full navigation; no further code runs.  
- Login `setTimeout(() => navigate('/'), 1500)` is cleared on unmount via `clearTimeout(recoveryTimerRef.current)`.

---

## 6. Hydration/SSR Issues

**No SSR/hydration issues found.** No `useState` initializers that read `window` or `document`. Main.tsx GA/Sentry/SW block is behind `import.meta.env.PROD` and `hasConsent` — client-only.

---

## 7. TypeScript `as any` / Unsafe Casts

**No `as any` found.**  
- `main.tsx` uses `(window as unknown as Record<string, unknown[]>)` for dataLayer — acceptable for gtag.  
- Tracker uses `(error as { code?: string })` for Supabase error — localized, acceptable.

---

## Additional Bugs (Outside Original 7 Patterns)

### Bug: `useState(Date.now)` — function reference instead of timestamp

| File | Line | Code | Issue | Severity |
|------|------|------|-------|----------|
| `src/pages/Dashboard.tsx` | 167 | `useState(Date.now)` | Initial state is the function `Date.now`, not a number. Used in `activity.lastCheckedAt - new Date(last.logged_at).getTime()` → `NaN` for "آخر حقنة منذ" on first render after loading completes | **High** |

**Fix:** `useState(Date.now)` → `useState(Date.now())`.

---

### Bug: Reviews handleSubmit — no mounted check before setState after async

| File | Line | Code | Issue | Severity |
|------|------|------|-------|----------|
| `src/pages/Reviews.tsx` | 163–166 | `setSubmitted(true); setRating(0); setText(''); fetchReviews(); setTimeout(...)` | After `await supabase...insert`, if user navigates away, setState runs on unmounted component. Community.tsx uses `mountedRef.current` for this; Reviews does not | **Medium** |

**Fix:** Add `mountedRef` and guard: `if (!mountedRef.current) return;` before setState calls after await, and clear timeouts on unmount.

---

## Summary

| Category | Bugs Found |
|----------|------------|
| Timezone | 0 |
| Number formatting | 5 (low) |
| Keyboard/input | 3 (2 medium, 1 low) |
| Memory leaks | 0 |
| Router/state race | 0 |
| Hydration/SSR | 0 |
| TypeScript casts | 0 |
| **Other** | **2 (1 high, 1 medium)** |

**Recommended priorities:**
1. **High:** Dashboard `useState(Date.now)` → `useState(Date.now())`
2. **Medium:** Reviews mounted check, Community/ProtocolWizard `inputMode`
3. **Low:** Optional Arabic number formatting and blur-after-submit
