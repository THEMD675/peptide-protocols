# Auth & subscription — dependency map (for safe changes)

Use this when changing AuthContext or anything that reads `user` / `subscription` / `isLoading`. Don’t break dependents.

---

## 1. Single source of truth

- **AuthContext** is the only place that sets: `user`, `subscription`, `isLoading`.
- **subscription** is set only by:
  - `fetchSubscription(userId)` success → `setSubscription(buildSubscription(data))`
  - No session / error / 3 failures → `setSubscription(DEFAULT_SUBSCRIPTION)`
- **isLoading** becomes `false` only when:
  - `INITIAL_SESSION` handler runs and calls `setIsLoading(false)` after `handleSession`, or
  - 30s timeout runs and sets `initDoneRef = true` + `setIsLoading(false)` (no check for in-flight fetch).

So: if the timeout fires while `fetchSubscription` is still in progress, we set `isLoading = false` with `subscription` still DEFAULT. When `fetchSubscription` later completes, `subscription` updates. In between, every consumer sees “free” and may redirect or show wrong UI.

---

## 2. Contract: “when isLoading is false”

Consumers assume: **subscription is the current state for this user** (or we have no user).

So any change to when we set `isLoading = false` must keep that true. Don’t set `isLoading = false` while subscription is still unknown (e.g. in-flight fetch) if we have a session.

---

## 3. Who reads auth (and how)

| Consumer | Reads | If wrong / late |
|----------|--------|------------------|
| **ProtectedRoute** | user, subscription.isProOrTrial, isLoading | isLoading false + default subscription → redirect to /pricing even for paid user. |
| **HomeRedirect** (/) | user, subscription?.isProOrTrial, isLoading | Same: wrong redirect or no redirect. |
| **TrialBanner** | user, subscription.*, isLoading | Wrong banner/modal (e.g. “اشترك” for paid, or no banner when trial). |
| **PaymentProcessing** | subscription.isProOrTrial, refreshSubscription | Post-checkout may stay on “loading” until refreshSubscription runs. |
| **Dashboard** | user, subscription.*, refreshSubscription | Wrong tier label, wrong CTAs, wrong visibility of blocks. |
| **Tracker** | user, subscription.isProOrTrial | Form hidden, wrong banner. |
| **Coach** | user, subscription.tier, isProOrTrial, isTrial | Wrong limits, wrong upgrade CTA. |
| **Header** | user, subscription.tier, subscription.status | Wrong tier/status in nav. |
| **Landing** | user, subscription.isProOrTrial | Wrong redirect / CTA. |
| **Pricing** | user, subscription.status/tier | Wrong “current plan” / buttons. |
| **Account** | user, subscription.*, refreshSubscription | Wrong plan display, wrong actions. |
| **Guide, LabGuide, Stacks, PeptideTable, PeptideDetail, Library, DoseCalculator, InteractionChecker** | subscription.isProOrTrial (or isPaidSubscriber/isTrial), isLoading | Wrong “pro” content visibility, wrong blur. |
| **usePeptideProtocol** | subscription.isProOrTrial | Wrong protocol access. |
| **ExitIntentPopup** | subscription.trialDaysLeft | Wrong countdown. |
| **OnboardingModal** | user only | Safe. |

---

## 4. Who calls refreshSubscription

- **PaymentProcessing** — when overlay visible and stage loading (post-checkout).
- **Dashboard** — interval when trial (hourly).
- **Account** — after cancel-subscription flow.
- **upgradeTo** (AuthContext) — after reactivation.

So: if initial load never gets subscription (e.g. timeout), nothing else refetches until user hits one of these. So fixing the “timeout” path (e.g. don’t set isLoading false until we have subscription or 401, or trigger one retry and then set) avoids showing “free” for a paid user.

---

## 5. Routes wrapped in ProtectedRoute (requiresSubscription default true)

- /dashboard, /tracker, /coach, /calculator, /lab-guide, /interactions  
So any change that makes `subscription.isProOrTrial` wrong (e.g. default while fetch in flight) will redirect paid users away from these routes until subscription updates.

**Account** uses `requiresSubscription={false}` — only needs user.

---

## 6. Safe-change checklist (when touching AuthContext or subscription)

- [ ] When do we set `isLoading = false`? If we add/change a path (e.g. timeout + retry), does subscription already match user (or we have no user)?
- [ ] If we change `buildSubscription` or DEFAULT_SUBSCRIPTION, do TrialBanner, ProtectedRoute, and Dashboard still get the right branches (e.g. isProOrTrial, needsPaymentSetup)?
- [ ] If we change when/how `refreshSubscription` is called, does PaymentProcessing still get a refresh after checkout? Does Dashboard still refresh for trial users?
- [ ] Any new consumer of `user`/`subscription`/`isLoading` must assume the same contract: isLoading false ⇒ subscription is definitive for current user (or no user).
