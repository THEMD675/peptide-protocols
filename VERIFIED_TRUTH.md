# pptides.com — VERIFIED TRUTH (From Live Services)

**Date:** 2026-03-02  
**Method:** Direct API calls to Stripe, Supabase, DeepSeek. Not code — REALITY.

---

## STRIPE — VERIFIED VIA API

### Prices (CORRECT)
| Price ID | Amount | Currency | Interval | Product | Status |
|----------|--------|----------|----------|---------|--------|
| price_1T6QrYAT1lRVVLw7UNdI4t2g | 3400 (34 SAR) | SAR | monthly | Essentials | ACTIVE ✅ |
| price_1T6QrZAT1lRVVLw7qu0FZIWT | 37100 (371 SAR) | SAR | monthly | Elite | ACTIVE ✅ |
| price_1T6S6LAT1lRVVLw7i0GUsfdr | 29600 (296 SAR) | SAR | annual | Essentials | ACTIVE ✅ |
| price_1T6S6LAT1lRVVLw7YBWuBaG1 | 296300 (2963 SAR) | SAR | annual | Elite | ACTIVE ✅ |

### Prices (OLD — SHOULD BE ARCHIVED)
| Price ID | Amount | Currency | Product |
|----------|--------|----------|---------|
| price_1T4iQ5AT1lRVVLw7Vyt0yUa3 | 900 ($9) | USD | Essentials |
| price_1T4iQ7AT1lRVVLw78GvXJO4e | 9900 ($99) | USD | Elite |
| price_1T4hZsAT1lRVVLw7SPetR6Pu | 900 ($9) | USD | Old Standard |
| price_1T4g7WAT1lRVVLw7trYibUp1 | 19000 ($190) | USD | Old "Peptide Guide" |
| price_1T4g7TAT1lRVVLw7jhmHNvVV | 1900 ($19) | USD | Old "Peptide Guide" |
| price_1T4g7RAT1lRVVLw7kXV27YxB | 900 ($9) | USD | Old "Peptide Guide" |
| price_1T2ZgYAT1lRVVLw70Z8P5XJY | 12800 ($128) | USD | Old yearly |
| price_1T2ZgHAT1lRVVLw7mwB1AxSG | 1334 ($13.34) | USD | Old monthly |
| price_1So6xsAT1lRVVLw7uWJ58qXd | 999 ($9.99) | USD | Old monthly |

**16 old prices still active.** 4 correct SAR prices in use.

### Products
| Product ID | Name | Status | Issue |
|-----------|------|--------|-------|
| prod_U2o2ctKjzjPEjp | pptides Essentials | Active | ✅ Correct |
| prod_U2o23DvDEDGNo1 | pptides Elite | Active | ✅ Correct |
| prod_U2nANJc9MMLa5h | Peptide Guide — Premium | Active | ❌ OLD — archive |
| prod_U2nA88jJqKp079 | Peptide Guide — Standard | Active | ❌ OLD — archive |
| prod_U2le1soGEalWSI | Peptide Guide | Active | ❌ OLD — archive |
| prod_U2legcuqhTFQ4F | Peptide Guide | Active | ❌ OLD — archive |
| prod_U2le15YqOs3lzp | Peptide Guide | Active | ❌ OLD — archive |
| prod_U0arRimfcHaBMs | Peptide Guide | Active | ❌ OLD — description says "AI-powered customer service for Saudi businesses"!! |
| prod_TleGiAfezGJJH6 | Peptide Guide | Active | ❌ OLD — archive |
| prod_ThTbwgWan8YdIU | Peptide Guide | Active | ❌ OLD — archive |

**8 old products still active.** One has description from a completely different app.

### Real Subscriptions
| Sub ID | Status | Customer | Price | Amount |
|--------|--------|----------|-------|--------|
| sub_1T68PE... | trialing | cus_U4Gx... | price_1T4iQ5... | **$9 USD** |
| sub_1T67md... | trialing | cus_U4GJ... | price_1T4iQ5... | **$9 USD** |
| sub_1T67Kk... | trialing | cus_U4Fq... | price_1T4iQ5... | **$9 USD** |
| sub_1T5z3r... | trialing | cus_U47I... | price_1T4iQ5... | **$9 USD** |

**ALL 4 subscriptions are on the OLD $9 USD price, NOT the 34 SAR price.**  
These are all test accounts (Abdullah's emails).  
After trial ends, they will be charged $9 USD, not 34 SAR.

### Real Customers
5 total — all test accounts (Abdullah's emails). No real customers yet.

### Webhook Configuration
- **Main webhook**: ENABLED, correct Supabase URL, all 11 events ✅
- **Description says "Recovery OS Supabase Functions"** ❌ — old branding
- **Old disabled webhook exists**: stripe-webhook-nu.vercel.app ❌ — should delete

### Stripe Account Branding
| Setting | Value | Issue |
|---------|-------|-------|
| Business Name | pptides | ✅ Correct |
| Statement Descriptor | PPTIDES | ✅ Correct |
| Support Email | contact@pptides.com | ✅ Correct |
| Support URL | https://pptides.com/account | ✅ Correct |
| Support Phone | +97142285285 | ✅ |
| Country | AE | ✅ |
| Default Currency | **AED** | ⚠️ Not SAR — prices override this |
| Branding Color | **#cc7552 (orange)** | ❌ Should be #059669 (emerald) |
| Branding Icon | file_1RtT8l... (exists) | ⚠️ Need to verify it shows pptides |
| Branding Logo | **None** | ❌ No logo on checkout page |

### Checkout Events
5 recent checkout.session.completed — all amount_total = 0 (trial starts), all succeeded.

---

## SUPABASE — VERIFIED

### Edge Functions: ALL 14 ACTIVE ✅
All deployed 2026-03-02. All status: ACTIVE.

### Secrets: ALL SET ✅
26 secrets configured including:
- DEEPSEEK_API_KEY ✅ (verified VALID — returns deepseek-chat, deepseek-reasoner)
- STRIPE_SECRET_KEY ✅
- STRIPE_WEBHOOK_SECRET ✅
- STRIPE_PRICE_ESSENTIALS ✅
- STRIPE_PRICE_ELITE ✅
- STRIPE_PRICE_ESSENTIALS_ANNUAL ✅
- STRIPE_PRICE_ELITE_ANNUAL ✅
- RESEND_API_KEY ✅
- VAPID_PUBLIC_KEY ✅
- VAPID_PRIVATE_KEY ✅

### Issues Found in Secrets
- **REVORA_URL** secret exists — old branding, should be removed
- **STRIPE_PRICE_MONTHLY** — extra price secret, unclear purpose

---

## DEEPSEEK — VERIFIED

API key is **VALID**. Available models: deepseek-chat, deepseek-reasoner.  
**Coach AI SHOULD work** — the key is set and valid. If it's broken, it's a code issue not a key issue.

---

## CORRECTIONS TO PREVIOUS PLAN

### Things I said were broken but ARE ACTUALLY FINE:
1. ~~T0-3: DEEPSEEK_API_KEY not set~~ → **IT IS SET AND VALID**
2. ~~Stripe prices wrong~~ → **ALL 4 SAR PRICES CORRECT AND ACTIVE**
3. ~~Stripe webhooks not registered~~ → **ALL 11 EVENTS REGISTERED AND ENABLED**
4. ~~Stripe branding shows AMIRIS~~ → **Business name IS "pptides", descriptor IS "PPTIDES"**

### NEW ISSUES FOUND (no plan mentioned these):
1. **4 existing subscriptions on OLD $9 USD price** — will charge $9 not 34 SAR when trial ends
2. **16 old Stripe prices still active** — messy, confusing, could be selected accidentally
3. **8 old products still active** — one describes "AI-powered customer service for Saudi businesses"
4. **Stripe branding color #cc7552 (orange)** — doesn't match site's emerald green
5. **No Stripe logo** — checkout page has no logo
6. **Webhook description says "Recovery OS"** — old branding
7. **Old disabled webhook endpoint** — should be deleted
8. **REVORA_URL secret in Supabase** — old branding
9. **Default currency AED** — not SAR (prices override but could cause display issues)
10. **VAPID keys exist** — push notification failure is code-side (applicationServerKey: undefined in frontend), not missing keys

---

## LIVE SITE — VERIFIED

### What works:
- Landing page loads, SAR pricing displayed ✅
- Library page loads, 41+ peptides displayed ✅
- Age gate overlay present ✅
- Navigation works ✅
- pptides branding throughout ✅
- Schema.org structured data shows SAR ✅

### Not yet tested:
- Full E2E payment flow (needs Stripe test mode)
- Coach AI chat (needs login)
- Email sending (needs trigger)
- Mobile viewport
- All 26 routes

---

*This document contains findings from LIVE API calls, not code reading.*
