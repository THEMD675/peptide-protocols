# User & Admin Journeys — UX Map

**Last updated:** 2026-03-02

---

## User Journey

| Step | Path | Notes |
|------|------|-------|
| **Landing** | `/` | Hero, pricing (34/371 ر.س), trial (3 أيام), CTAs. Age gate on first visit. |
| **Library** | `/library` | 41 peptides, search, category filter. Free content + paywalled. |
| **Peptide detail** | `/peptide/:id` | Full protocol. Anonymous sees blur + "اشترك لعرض البروتوكول". |
| **Pricing** | `/pricing` | Essentials vs Elite, trial messaging. |
| **Login / Signup** | `/login`, `/signup` | Same page, tab switch. Email, Google, forgot password. Redirect after auth. |
| **Dashboard** | `/dashboard` | Protected. Onboarding modal, quick links, tips, activity. |
| **Account** | `/account` | Subscription, referral code, delete account. Access via header dropdown or mobile drawer. |
| **Coach** | `/coach` | Protected. AI chat. Requires DEEPSEEK_API_KEY. |
| **Tracker** | `/tracker` | Protected. Injection log. |
| **Bottom nav** (mobile, logged in) | Dashboard, Tracker, Library, Coach | Fixed bottom bar. |

**Header (logged in):** لوحة التحكم | سجل الحقن | المكتبة | المدرب | الأدوات ▼ | Search | Avatar ▼  
**Avatar dropdown:** لوحة التحكم | إعدادات الحساب | لوحة الإدارة | — | تسجيل الخروج

**Mobile drawer (logged in):** Same nav + Account (إعدادات الحساب) + Admin (لوحة الإدارة) + Logout

---

## Admin Journey

| Step | Path | Notes |
|------|------|-------|
| **Access** | `/admin` | Link in user dropdown (لوحة الإدارة). Non-admins get "Access Denied" + Back to Dashboard. |
| **Overview** | Tab: Overview | Alerts, MRR, users, funnel, trials, quick actions. |
| **Users** | Tab: Users | Search, filter (all/paid/trial/churned/free), extend trial, grant sub, cancel, suspend, delete. |
| **Activity** | Tab: Activity | Feed (signup, coach, injection, review, enquiry). |
| **Reviews** | Tab: Reviews | Pending reviews: Approve / Delete. |
| **Enquiries** | Tab: Enquiries | Reply inline. Sends via send-enquiry-reply edge function. |
| **Health** | Tab: Health | Run Health Check | Run Stripe Verify. No CRON_SECRET needed for Stripe. |

**Admin header:** ← Dashboard | Control Center | Email | Refresh | Tabs

**Error / 403 states:** Retry + Back to Dashboard

---

## Key UX Fixes (2026-03-02)

1. **Admin link** — Added to user dropdown (desktop) and mobile drawer. Non-admins see 403 with clear "Back to Dashboard".
2. **Account in mobile** — إعدادات الحساب link in mobile drawer (was only in desktop dropdown).
3. **Admin escape hatches** — "← Dashboard" in admin header; "Back to Dashboard" on 403 and error states.
