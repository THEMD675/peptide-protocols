# pptides.com — TRUTH PLAN (Single Source)

**Date:** 2026-03-02  
**Principle:** Paranoid perfectionism. Verify every claim. No edits without proof. Execute once when plan is solid.  
**Repo:** `/Users/abdullahalameer/Desktop/Projects/REWIRE/peptide-protocols`  
**Live:** https://pptides.com

---

## 1. VERIFIED TRUTHS (Checked This Session)

| What | How | Result |
|------|-----|--------|
| Live index.html Schema.org | `mcp_fetch raw` https://pptides.com | **priceCurrency: SAR, price: 34/371** |
| Git HEAD a638ef2 index.html | `git show a638ef2:index.html` | **priceCurrency: USD, price: 9/99** |
| Live pricing UI | Browser /pricing | **34 ر.س / شهريا** (SAR) |
| Live peptide (semaglutide) | Browser /peptide/semaglutide | Content visible, "اشترك — 34 ر.س" |
| Deployed TrialBanner FREE_PATHS | `git show a638ef2:src/components/TrialBanner.tsx` | **Includes `/peptide`** → all peptide pages free for expired users |
| Local TrialBanner FREE_PATHS | `src/components/TrialBanner.tsx` | **No `/peptide`**; uses `isPeptideFree` (FREE_PEPTIDE_IDS) |
| Deployed analytics.ts | `git show a638ef2:src/lib/analytics.ts` | **currency: 'USD'** |
| Local analytics.ts | `src/lib/analytics.ts` | **currency: 'SAR'** |
| Deployed constants.ts | `git show a638ef2:src/lib/constants.ts` | **9/99 USD** |
| Local constants.ts | `src/lib/constants.ts` | **34/371 SAR** |
| Stripe key in .env | `grep STRIPE_SECRET_KEY .env` | **Absent** |
| semaglutide in FREE_PEPTIDE_IDS | grep peptides.ts | **No** — paid peptide |

### Critical Conclusion

**Live site (pptides.com) serves SAR.** Git HEAD a638ef2 serves USD. Therefore **Vercel production is NOT deploying from commit a638ef2**. It is deploying from a different source (branch, or local build with uncommitted changes). **User must verify in Vercel dashboard: which commit/branch is production?**

---

## 2. LINE-BY-LINE VERIFICATION: R2–R11 (2026-03-02)

Every claim checked against `git show a638ef2:<file>` and local files.

| Item | MASTER_PLAN claim | Verified truth |
|------|-------------------|----------------|
| **R2** OAuth delete | Deployed: no password. Local: signInWithPassword blocks OAuth. | **VERIFIED.** Deployed: direct delete-account API. Local: signInWithPassword + isOAuthUser check. |
| **R3** Password change | Deployed: no current password. Local: signInWithPassword blocks OAuth. | **VERIFIED.** Deployed: `updateUser` only (line 82). Local: signInWithPassword before updateUser. |
| **R4** Cancel discount | Deployed: clean cancel. Local: "ابقَ مع الخصم" fake. | **STALE.** Local has no "ابقَ مع الخصم". Cancel dialog has "الاحتفاظ بالاشتراك", "إيقاف مؤقت" toast. Re-check. |
| **R5** Dashboard polling | Deployed: no polling. Local: duplicate polling. | **FIXED.** Local has comment "Payment polling handled by AuthContext — no duplicate here". No setInterval. |
| **R6** Dashboard no-sub msg | Deployed: "ابدأ تجربتك". Local: "اشتراكك منتهي" always. | **FIXED.** Local: `status === 'none' \|\| undefined` → "ابدأ اشتراكك"; else → "اشتراكك منتهي". |
| **R7** PWA start_url | Deployed: '/'. Local: '/dashboard'. | **WRONG.** Local vite.config line 31: `start_url: '/'`. Same as deployed. |
| **R8** Cron migration | Deployed: file absent. Local: lacks x-cron-secret. | **VERIFIED.** Migration is untracked; if applied, needs auth. |
| **R9** COMMUNITY_WHATSAPP | Deployed: absent. Local: added empty, never imported. | **WRONG.** Deployed has SUPPORT_WHATSAPP/SUPPORT_WHATSAPP_URL. No COMMUNITY_WHATSAPP in local. |
| **R10** Footer MessageCircle | Deployed: no MessageCircle. Local: added, unused. | **WRONG.** Local Footer: Lock, Shield, Mail only. No MessageCircle. |
| **R11** App cookieHandled | Deployed: none. Local: destructured, unused. | **UNVERIFIED.** Grep found no cookieHandled in App.tsx. May be fixed. |

### Summary of errors in MASTER_PLAN

- **R4:** Claim stale — no "ابقَ مع الخصم" in local.
- **R5, R6:** Local already fixed.
- **R7:** Local has start_url '/' — not '/dashboard'.
- **R9:** Wrong constant name; COMMUNITY_WHATSAPP doesn't exist.
- **R10:** Local doesn't have MessageCircle.
- **R11:** Needs re-check.

---

## 2b. MASTER_PLAN CORRECTIONS (What Was Wrong)

| MASTER_PLAN claim | Actual truth |
|-------------------|--------------|
| R1: "Deployed FREE_PATHS = [...'/community'] only" | **FALSE.** Deployed has `/peptide`, `/library`, `/table`, etc. in FREE_PATHS. |
| R1: "Local adds /dashboard, /tracker, /coach" | **Partial.** Local adds `/about`, `/faq`, `/quiz`. Local **removes** `/peptide` and uses `isPeptideFree`. |
| R1: "Deployed blocking modal WORKS" | **Questionable.** With `/peptide` in FREE_PATHS, ALL peptide pages are free. Paywall bypass on deployed. |
| "Deployed = a638ef2" | **FALSE for live.** Live HTML has SAR; a638ef2 has USD. |
| CURRENT STATE table: "Paywall \| Working" for deployed | **WRONG.** Deployed has paywall bypass (/peptide in FREE_PATHS). |
| CURRENT STATE: "Local \| BROKEN" for paywall | **WRONG.** Local FIXES paywall (removes /peptide). |

---

## 3. DEPLOYED (a638ef2) vs LOCAL — CODE TRUTH

| File | Deployed (a638ef2) | Local |
|------|--------------------|-------|
| index.html Schema.org | USD 9/99 | SAR 34/371 |
| analytics.ts | USD | SAR |
| constants.ts | 9/99 USD | 34/371 SAR |
| TrialBanner FREE_PATHS | Has `/peptide` (paywall bypass) | No `/peptide`, uses isPeptideFree |
| admin-stats MRR | 9×essentials + 99×elite | 34×essentials + 371×elite |

**Live site shows SAR** → deployed source is not a638ef2. Confirm in Vercel.

---

## 4. DISMISSED / UNFULFILLED (From Transcripts)

From prior audit work:

- Real user payment flow never activated or verified
- Stripe test card end-to-end never verified
- 670 AUDIT.md items (Batches 4–12) skipped
- Referral system never end-to-end tested
- 4 DB tables with no UI
- 4 blocking overlays (interruptions)
- 9 features promised but not functional
- Payment redirect loops
- Duplicate protocol creation
- Session expiry mid-form data loss
- DEEPSEEK_API_KEY not set → Coach returns 500
- Migration 20260301100001 (RLS) — applied? Unverified.
- health-check CORS — not verified

---

## 5. MANUAL STEPS (User Must Do)

### 5.1 Vercel

- [ ] Open Vercel dashboard for pptides.com
- [ ] Note production deployment commit SHA
- [ ] Confirm: does it match a638ef2 or something else?

### 5.2 Stripe

- [ ] Get `STRIPE_SECRET_KEY` from Supabase Edge Function secrets or Stripe Dashboard
- [ ] Run: `STRIPE_SECRET_KEY=sk_xxx node scripts/verify-stripe.js`
- [ ] Confirm: price IDs match SOURCE_OF_TRUTH, webhooks registered

### 5.3 Supabase

- [ ] Migration 20260301100001 applied?
- [ ] DEEPSEEK_API_KEY set for ai-coach?

### 5.4 Full E2E (Signup → Checkout → Stripe → success)

- [ ] Create test user
- [ ] Complete checkout with Stripe test card
- [ ] Confirm payment=success redirect and subscription state

---

## 6. SINGLE EXECUTION PLAN (Do Not Execute Until User Agrees)

**Rule:** One plan. Update as we audit. Execute only once when solid.

### Phase 0 — Verification (No Code Touch)

1. User verifies Vercel production commit
2. User runs Stripe verify with key
3. User confirms migrations applied
4. Document: what is ACTUALLY deployed

### Phase 1 — If Deployed = a638ef2

Then fix deployed regressions per MASTER_PLAN R2–R11 (OAuth, PWA, etc.). **R1 paywall:** Deployed has bypass; local fixes it. Deploy local TrialBanner (remove /peptide from FREE_PATHS).

### Phase 2 — If Deployed ≠ a638ef2

Then we have a different baseline. Re-audit what is actually live from that commit. Align plan to that truth.

### Phase 3 — Bugs in BOTH (33 items)

Per MASTER_PLAN Phase 2: currency, auth, payment flow, edge functions, data integrity, content, infra, a11y. Fix after Phase 1/2.

### Phase 4 — Dismissed Items

Address 670 AUDIT items, referral E2E, 4 tables no UI, Coach 500, etc. After Phases 1–3.

---

## 7. LAST USER MESSAGE (Context)

> "again! ur not allowed to touch anything without actually knowing the truth... paranoid perfectionism in this audit. stop avoiding the manual work... the issue is not all of whats written is actually true against what actually in the app and deployed... where is the repo of pptides.com? u need to fully understand it... go even to breadcrumbs now old chats bubbles everything end to end... what u did was not enterprise level nor cover to cover nor end to end... we need every line code feature to be audited... and everytime u think ur sure go again... go again... keep updating the plan until we agree one plan... execute only once and the plan to be fully solid... full plan and its todos etc end to end after auditing all the chats and errors and what i asked for too and was not delivered"

---

## 8. MCP MEMORY (Stored for Future Sessions)

- Repo: `/Users/abdullahalameer/Desktop/Projects/REWIRE/peptide-protocols`
- Live: https://pptides.com
- User: paranoid perfectionism, verify before touch, execute once when plan solid
- Live has SAR; a638ef2 has USD → Vercel source unknown
- Dismissed: 670 AUDIT items, real payment never verified, referral E2E never tested

---

## 9. WHAT WAS OVERLOOKED (Acknowledged)

The original plan had errors because:

- **No line-by-line verification** — Claims were copied without `git show` + grep for each item.
- **Paywall direction wrong** — Stated deployed = correct, local = broken. Truth: deployed = broken, local = fixed.
- **Stale regression list** — R5, R6, R7, R10 were already fixed; R4, R9 had wrong details.
- **CURRENT STATE table inverted** — Paywall row backwards.

This session: every R2–R11 checked against actual code. Corrections applied to MASTER_PLAN and TRUTH_PLAN.

---

## 10. NEXT ACTIONS

1. **User:** Run manual steps (Vercel commit, Stripe verify, migrations)
2. **User:** Confirm or correct this plan
3. **Assistant:** Re-verify R4, R8, R9, R11; then Phase 2 (B1–B33) item-by-item
4. **Both:** Agree on execution order
5. **Execute:** Only after agreement
