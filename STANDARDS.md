# pptides.com — Standards Document

**Purpose:** Formal benchmark for this project. Locked before any code changes. Every fix must meet these standards.  
**Status:** DRAFT — User must review and agree before execution.

---

## 1. Functional Standards

| Area | Standard |
|------|----------|
| Routes | All 28 routes load without 404 or blank screen |
| Payment | Checkout completes or fails gracefully; webhook never drops; user never charged without access |
| Auth | Signup, login, logout, password reset, OAuth — all work; session never corrupts |
| Paywall | FREE_PATHS must NOT include premium routes (/dashboard, /tracker, /coach); /peptide must gate by peptide ID not path prefix |
| Trial | Trial users have full access (hasFullAccess = isPaid \|\| isTrial) |
| Billing portal | Trial + past_due users can access Stripe portal to fix payment |

---

## 2. Security Standards

| Area | Standard |
|------|----------|
| RLS | No USING (true) on subscription SELECT or referral UPDATE |
| Secrets | Zero client-side secrets; Stripe keys only in edge functions |
| XSS | All user/AI content sanitized (DOMPurify) before render |
| CORS | Production edge functions do not allow wildcard origin |
| Cron | trial-reminder, health-check require CRON_SECRET header |

---

## 3. UX Standards

| Area | Standard |
|------|----------|
| Loading | Skeleton where possible; no infinite spinners |
| Errors | Every failure shows actionable message |
| Empty states | Clear guidance when no data |
| Mobile | 375px, 414px viewports; no overlapping elements; bottom nav |
| RTL | Logical properties; correct direction |

---

## 4. Performance Standards

| Area | Standard |
|------|----------|
| Chunks | No single chunk > 400KB blocking first paint |
| N+1 | No N+1 queries |
| Memoization | Expensive computations memoized (useMemo) |

---

## 5. Accessibility Standards

| Area | Standard |
|------|----------|
| WCAG | 2.1 AA minimum |
| Touch targets | 44px minimum |
| Focus | Visible focus order; Escape closes modals |
| ARIA | role, aria-label where required |

---

## 6. Deployment Standards

| Area | Standard |
|------|----------|
| Zero downtime | Vercel atomic deploys; no user-facing outage |
| Migrations | Backward-compatible only; add before drop |
| Env vars | Never remove before code stops using |
| Rollback | One-click revert; document exact steps |

---

## 7. Operational Standards

| Area | Standard |
|------|----------|
| Monitoring | Sentry; maskAllText for health data |
| Health check | /health or edge function returns 200 before cutover |
| Runbook | Document incident response |

---

## Acceptance

**This document is the contract.** Verification proves compliance. Execution delivers compliance.  
No fix is "done" until it meets the standard.  
User must agree to STANDARDS.md before any code execution.
