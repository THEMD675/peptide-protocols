# AGENT RULES — pptides.com

**Read this BEFORE touching a single line of code. No exceptions.**

---

## RULE 1: Think Like a Customer, Not a Developer

You are a Saudi professional considering paying 34-371 SAR/month for a peptide education platform. You found this site through a friend's referral link.

**Your mindset:**
- If ONE button doesn't work → you leave and never come back
- If the font looks wrong → you don't trust the site
- If the journey feels confusing → you think it's a scam
- If there's a single error → you think 10 times before paying
- If the Arabic feels robotic → it's not for you

**Every pixel, every word, every click matters.**

---

## RULE 2: The User Journey is ONE System

This is not a collection of pages. This is ONE flow that must feel natural:

### The Happy Path (must be FLAWLESS):
1. **Land** → User comes from referral link (?ref=PP-XXXXXX) or direct
2. **Discover** → Browse 6 free peptides, read blog, take quiz
3. **Trust** → See social proof, scientific references, clean design
4. **Sign up** → Email or Google, instant redirect to dashboard
5. **Onboard** → Select health goal → see personalized 3-day plan
6. **Experience trial** → 3 days free, all features unlocked, card NOT required upfront
7. **Hit paywall** → After trial, premium content locked, pricing page shown
8. **Pay** → Stripe checkout with trial-applied pricing
9. **Use** → Track injections, ask AI coach, explore protocols
10. **Share** → Referral code gives friend discount, you get reward
11. **Consider cancel** → Survey → 20% retention offer → cancel if declined
12. **Win back** → Email sequence with special offer

### Every step connects to the next. Breaking one step breaks the whole funnel.

---

## RULE 3: Sales & Offers System (Ameer's Orders)

### Pricing
- **Essentials**: 34 SAR/month, 296 SAR/year (save 27%)
- **Elite**: 371 SAR/month, 2,963 SAR/year (save 33%)
- Currency: SAR only, displayed as "ر.س"
- Daily cost breakdown shown (١.١ ر.س/يوم for Essentials)

### Trial
- 3 days free
- All features unlocked during trial
- Credit card NOT required to start trial
- Trial users who add card get Stripe trial (no charge for 3 days)
- Trial users without card get DB trial (expires automatically)
- Trial ending → email reminders at 24h, 12h, 2h before

### Referral System
- Every user gets a code: PP-XXXXXX (generated on account creation)
- Landing page shows referral section: "ادعُ صديقًا واحصل على مكافأة"
- **What the friend gets**: Discount applied at checkout via referral code
- **What the referrer gets**: Reward coupon (free month) when friend pays
- Referral is tracked: `referrals` table with status (pending → converted → rewarded)
- Stripe webhook processes referral reward on `invoice.paid`

### Cancel Retention
- Step 1: Survey (why are you leaving? — 5 options)
- Step 2: 20% retention offer → `retention_20_pct` Stripe coupon
- Step 3: If declined → cancel_at_period_end (keep access until period ends)
- Confirmation email sent with "resubscribe" CTA

### Win-back Emails
- Sent to cancelled/expired users
- Includes `retention_20_pct` promo code
- CTA links to /pricing?coupon=retention_20_pct

### Admin Accounts
- Manually granted accounts (no Stripe subscription) → `grant_source: 'admin'`
- Admin accounts should NOT see: cancelled banner, cancel button, payment management
- Admin accounts should see: clean dashboard with full access

---

## RULE 4: Zero Errors Policy

### Before deploying ANY change:
1. `pnpm build` — MUST succeed with zero errors
2. Check TypeScript — zero type errors
3. Test the SPECIFIC flow you changed — end to end
4. Test on mobile width (375px) — no overflow, no cut text
5. Test dark mode — no invisible text or broken contrast
6. Test Arabic RTL — no misaligned elements

### After deploying:
1. `curl -s -o /dev/null -w "%{http_code}" https://pptides.com` → must be 200
2. Open the page you changed in browser → screenshot → verify visually
3. Check console → zero errors from your change
4. Check the NEXT page in the user journey → make sure you didn't break it

---

## RULE 5: Font & Design Standards

### Font
- **Primary**: Cairo (self-hosted in /public/fonts/)
- **Fallback**: Cairo Fallback (Arial with size-adjust)
- Never depend on Google Fonts CDN — fonts are self-hosted
- `font-display: swap` — text always visible

### Colors
- Primary: emerald-600 (#059669)
- Background: stone-50 (light), stone-950 (dark)
- Text: stone-900 (light), stone-100 (dark)
- Accent: emerald-700 for hover states
- Error: red-600
- Warning: amber-600

### Layout
- RTL throughout (`dir="rtl"` on root)
- Max width containers: `max-w-7xl mx-auto`
- Mobile: full-width with px-4 padding
- No fixed pixel widths on responsive elements
- Bottom nav on mobile (pb-20 clearance)

### Premium Feel
- Clean, minimal, warm tones
- No cluttered layouts — whitespace is premium
- Smooth transitions (300ms)
- Loading skeletons on every data fetch
- Confetti on milestones (tasteful, not excessive)

---

## RULE 6: Code Patterns

### Edge Functions
- ALWAYS have CORS headers (getCorsHeaders + handleCorsPreflightIfOptions)
- ALWAYS have rate limiting (checkRateLimit)
- ALWAYS handle errors with Arabic messages
- ALWAYS validate auth (Bearer token → supabase.auth.getUser)
- ALWAYS use AbortSignal.timeout(15000) on external calls
- Deploy with `--no-verify-jwt`

### Frontend
- Every button has loading state (disabled + spinner)
- Every async action has try/catch with Arabic toast
- Every redirect has a fallback
- Every form validates before submit
- useAuth() for auth state — never call supabase.auth directly in components
- Use buildSubscription() for subscription logic — never check DB status directly

### Database
- RLS on EVERY table
- No .upsert() — use select→insert/update pattern
- All user-facing columns have CHECK constraints
- HTML sanitization triggers on user input fields

---

## RULE 7: What NOT to Do

- ❌ Don't patch — understand the full flow before changing anything
- ❌ Don't deploy without building first
- ❌ Don't change fonts without testing Arabic rendering
- ❌ Don't add features without testing the adjacent features
- ❌ Don't modify auth flows without testing Google + email + trial
- ❌ Don't touch Stripe integration without testing checkout + cancel + portal
- ❌ Don't modify one page without checking the pages it links to
- ❌ Don't assume admin accounts work like regular accounts
- ❌ Don't use console.log for debugging in production code
- ❌ Don't create new Stripe coupons without documenting them
- ❌ Don't skip mobile testing
- ❌ Don't skip dark mode testing

---

## RULE 8: File Structure

```
src/
  pages/           — Route components (one per URL)
  components/      — Shared UI components
  contexts/        — AuthContext (the only global state)
  lib/             — Utilities, constants, supabase client
  data/            — Static data (peptides.ts, glossary.ts)
supabase/
  functions/       — Edge functions (one per directory)
  functions/_shared/ — Shared helpers (cors, rate-limit, email, etc.)
public/
  fonts/           — Self-hosted Cairo font files
```

### Key Files to Understand Before Any Change:
- `src/contexts/AuthContext.tsx` — ALL auth + subscription logic
- `src/lib/constants.ts` — TRIAL_DAYS, PEPTIDE_COUNT, SUPPORT_EMAIL
- `supabase/functions/_shared/` — Shared edge function utilities
- `supabase/functions/stripe-webhook/index.ts` — ALL payment event handling

---

## RULE 9: Testing Checklist

Run this BEFORE every deploy:

```
[ ] pnpm build succeeds
[ ] Homepage loads (200)
[ ] Login works (email + Google)
[ ] Dashboard loads for logged-in user
[ ] Pricing shows correct SAR prices
[ ] Checkout creates Stripe session
[ ] Account page loads all sections
[ ] Cancel flow works end-to-end
[ ] Library shows peptides
[ ] AI Coach responds
[ ] Mobile responsive (375px)
[ ] Dark mode works
[ ] Arabic RTL correct
[ ] Console: zero new errors
```

---

## RULE 10: NEVER Touch Browser Auth or Stripe Dashboard

- ❌ NEVER open Stripe Dashboard in a browser
- ❌ NEVER trigger OAuth flows, 2FA prompts, or login pages
- ❌ NEVER use Puppeteer/CDP to login to any service
- ✅ ALL Stripe operations via API (curl + secret key from Supabase secrets)
- ✅ ALL Supabase operations via CLI or REST API
- ✅ ALL changes via code edits, not UI clicks

**Ameer gets 2FA notifications on his phone. Triggering auth flows wastes his time and breaks trust.**

## RULE 11: When in Doubt

1. Read this file again
2. Read QA-RULES.md
3. Think: "Would a Saudi professional trust this?"
4. If still unsure: DON'T DEPLOY. Ask.

---

_Last updated: 2026-03-12_
_This file is mandatory reading for every agent touching pptides.com._
