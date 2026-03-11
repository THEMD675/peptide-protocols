# QA RULES — MANDATORY FOR EVERY AGENT

**These rules are NON-NEGOTIABLE. Every agent touching pptides.com code MUST follow these.**

## Before ANY Code Change
1. Read this file FIRST
2. Understand the FULL user journey being affected
3. Test the flow END TO END before AND after your change
4. Never deploy untested code

## The Golden Rule
**Every button is a promise. If it exists, it MUST work. No exceptions.**

## Critical User Journeys (MUST WORK PERFECTLY)

### 1. New User Signup Flow
- Visit /pricing → click "سجّل الآن" → /signup loads correctly
- Fill form → submit → account created → redirect to /dashboard
- Onboarding modal shows with 7 goals → select goal → see 3-day plan → dismiss
- Dashboard loads with welcome hero, all widgets functional

### 2. Google Sign-In Flow
- Click "تسجيل الدخول بـ Google" → Google popup or redirect
- If One Tap fails → automatic fallback to OAuth redirect (NEVER silent failure)
- After Google auth → redirect to dashboard
- Works on mobile, desktop, all browsers

### 3. Payment/Checkout Flow
- Logged-in user on /pricing → clicks subscribe button → loading state shows
- Edge function creates Stripe checkout → redirect to Stripe
- Stripe checkout completes → redirect to /dashboard?payment=success
- Subscription active, content unlocked immediately
- If checkout cancelled → redirect to /pricing?payment=cancelled with toast

### 4. Subscription Cancellation Flow
- Logged-in subscriber on /account → "إلغاء الاشتراك" button visible
- Click → survey dialog (reason selection) → retention offer (20% off)
- If accepts discount → coupon applied, dialog closes
- If continues cancel → cancel-subscription edge function called
- Stripe subscription set to cancel_at_period_end
- User keeps access until period end
- Confirmation email sent
- Banner shows "اشتراكك ملغي — ستحتفظ بالوصول حتى..."

### 5. Subscription Reactivation Flow
- Cancelled user on /pricing → "تجديد الاشتراك" button visible
- Click → either un-cancels in Stripe (if still in period) or opens portal
- Status updates to "active" in DB

### 6. Stripe Portal Access
- User on /account → "إدارة الدفع" → opens Stripe billing portal
- Must have stripe_customer_id to work
- Handle missing customer_id gracefully

### 7. Onboarding Flow
- New user (no activity, no protocols) → modal auto-shows
- Shows ONLY ONCE (stored in localStorage + DB)
- Goal selection → personalized 3-day plan with links
- "أعد إظهار" button on dashboard to re-trigger
- Works on mobile (full screen, scrollable)

### 8. Admin Account Special Handling
- Admin accounts (manually granted access) should NOT show:
  - "اشتراكك ملغي" banner
  - Confusing subscription states
- Admin accounts should show clean dashboard

## Font Rules
- Cairo font MUST load from Google Fonts
- Fallback font (Cairo Fallback → Arial with size-adjust) must be defined
- `font-display: swap` to prevent invisible text
- Preload the Arabic subset woff2 file
- If font doesn't load, site must still be readable (Arabic fallback)

## What Breaks Users (NEVER DO THESE)
- Silent failures (button click → nothing happens)
- Redirect loops
- Showing wrong subscription status
- Loading states that never resolve
- Modals that can't be dismissed
- Console errors visible to users
- Broken links (404s)
- Payment flows that error without explanation
- Onboarding showing to returning users every time

## Code Standards
- Every edge function MUST have CORS headers
- Every edge function MUST have error handling with Arabic error messages
- Every button MUST have a loading state
- Every async action MUST have a timeout (15s max)
- Every form MUST validate before submit
- Every redirect MUST have a fallback
- Every toast MUST be in Arabic

## Testing Checklist (Run Before EVERY Deploy)
- [ ] Build succeeds (`pnpm build` no errors)
- [ ] Homepage loads (HTTP 200)
- [ ] Login page loads, email login works
- [ ] Google sign-in button triggers popup or redirect
- [ ] Dashboard loads for logged-in user
- [ ] Pricing page shows correct prices (34 SAR / 371 SAR)
- [ ] Checkout button creates Stripe session (for new users)
- [ ] Account page loads all sections
- [ ] Cancel subscription flow works end-to-end
- [ ] Onboarding modal shows for new users only
- [ ] Library page loads with peptide cards
- [ ] AI Coach chat works
- [ ] Mobile responsive (no overflow, no cut-off text)
- [ ] Dark mode toggle works
- [ ] Arabic RTL layout correct throughout

## Deployment
- `pnpm build` → must succeed
- `vercel --prod --yes` → deploy (GitHub Actions broken, manual deploy required)
- Verify live site after deploy
- Check console for errors
