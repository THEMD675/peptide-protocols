# pptides.com — Single Source of Truth
# Last updated: March 2, 2026

## Stack
- **Frontend**: React 18 + TypeScript + Vite 7 + Tailwind CSS
- **Auth/DB**: Supabase (PostgreSQL + Auth + Edge Functions + RLS)
- **Payments**: Stripe (Checkout Sessions API + Webhooks + Customer Portal) — SAR currency
- **Email**: Resend
- **AI**: DeepSeek (deepseek-chat model) — MSA system prompt
- **Hosting**: Vercel
- **Domain**: pptides.com
- **PWA**: vite-plugin-pwa (start_url: /)

## Pricing (SAR)
- Essentials: 34 ر.س/month (annual 296 ر.س/year)
- Elite: 371 ر.س/month (annual 2,963 ر.س/year)
- 3-day free trial on all plans (card required, based on stripe_subscription_id not DB trigger)
- 3-day refund guarantee (contact support)
- Stripe prices: price_1T6QrYAT1lRVVLw7UNdI4t2g (Essentials), price_1T6QrZAT1lRVVLw7qu0FZIWT (Elite)
- Checkout locale: Arabic (locale: 'ar')

## Routes (26 pages)
| Route | Auth | Purpose |
|---|---|---|
| / | No | Landing (redirects to /dashboard if subscribed) |
| /login | No | Login/signup |
| /signup | No | Same as /login |
| /library | No | 47 peptide cards with FREE filter |
| /peptide/:id | No | Peptide detail + tease paywall (3 rows visible) |
| /calculator | No | Dose calculator (free tool, SAR costs) |
| /quiz | No | Goal-finding quiz |
| /stacks | No | Curated peptide stacks (SAR costs) |
| /lab-guide | No | Lab test guide |
| /guide | No | Injection guide |
| /pricing | No | Pricing page (SAR, comparison, Coach preview) |
| /reviews | No | Public reviews |
| /table | No | Peptide comparison table |
| /sources | No | Scientific references + vendor criteria |
| /community | No | User experiences |
| /interactions | No | Interaction checker |
| /glossary | No | Terminology with alphabet navigation |
| /about | No | About page with Organization JSON-LD |
| /faq | No | FAQ with 8 questions + FAQPage JSON-LD |
| /privacy | No | Privacy policy (6 third-party services listed) |
| /terms | No | Terms (SAR prices, indemnification, Saudi jurisdiction) |
| /dashboard | Yes | Dashboard + WellnessCheckin + LabResultsTracker |
| /tracker | Yes | Injection logging + SideEffectLog |
| /coach | Yes | AI coach chat (MSA, DeepSeek consent, preview) |
| /account | No* | Account management (*redirects to login internally) |
| /admin | Yes | Admin dashboard (email logs, payment events, pagination) |
| /logout | No | Logout and redirect to / |

## Edge Functions (14)
| Function | Trigger | External API |
|---|---|---|
| stripe-webhook | Stripe webhook POST | Stripe, Resend |
| ai-coach | Client POST | DeepSeek (MSA prompt, wellness+lab+protocol context) |
| create-checkout | Client POST | Stripe (SAR prices, Arabic locale, idempotency) |
| create-portal-session | Client POST | Stripe (rate limited) |
| cancel-subscription | Client POST | Stripe, Resend (rate limited) |
| delete-account | Client POST | Stripe, Resend (halt on error) |
| send-welcome-email | Client POST (signup) | Resend |
| trial-reminder | Cron job POST | Resend (6 reminder types + weekly_summary) |
| admin-stats | Client GET (admin) | Supabase Auth Admin (paginated) |
| admin-actions | Client POST (admin) | Stripe, Resend, Supabase (extend_trial, grant_sub, cancel_sub, suspend, delete, send_email, export_csv, approve/delete_review) |
| send-enquiry-reply | Client POST (admin) | Resend |
| inbound-email | Resend webhook POST | Resend (forwards to contact@pptides.com) |
| health-check | Cron job POST | Stripe, Resend, DeepSeek, Supabase |
| verify-stripe | Cron/remote POST (CRON_SECRET) | Stripe (price IDs, webhook events) |

## Database Tables (19 + email_logs)
| Table | UI | Key Columns |
|---|---|---|
| subscriptions | Dashboard, Account | user_id, status, tier, stripe_subscription_id, current_period_end |
| injection_logs | Tracker | user_id, peptide_name, dose, dose_unit, injection_site, logged_at |
| user_protocols | Tracker, Dashboard | user_id, peptide_id, dose, frequency, cycle_weeks, status |
| wellness_logs | Dashboard (WellnessCheckin) | user_id, energy, sleep, pain, mood, appetite, weight_kg, notes |
| lab_results | Dashboard (LabResultsTracker) | user_id, test_id, value, unit, tested_at, notes |
| side_effect_logs | Tracker (SideEffectLog) | user_id, symptom, severity, peptide_id, notes |
| user_profiles | Account, AuthContext | user_id, display_name, weight_kg, goals |
| community_logs | Community | user_id, peptide_name, goal, results, rating |
| reviews | Reviews | user_id, name, email, rating, content, is_approved |
| enquiries | Account, Admin | user_id, email, subject, message, status, admin_notes |
| referrals | AuthContext | referrer_id, referral_code, referred_email, status |
| email_list | EmailCapture | email, source |
| email_logs | Admin | email, type, resend_id, status |
| processed_webhook_events | stripe-webhook | event_id, event_type, processed_at |
| sent_reminders | trial-reminder | user_id, reminder_type |
| ai_coach_requests | ai-coach | user_id, created_at |
| reports | Community | user_id, target_type, target_id |
| rate_limits | Edge functions | user_id, endpoint, created_at |
| referral_rewards | Unused | — |

## Security
- RLS on all tables
- Subscription SELECT restricted to auth.uid() = user_id
- Referral UPDATE restricted to service role
- Rate limiting on create-checkout, cancel-subscription, create-portal-session
- CRON_SECRET constant-time comparison
- Coach XSS: DOMPurify on print
- Admin auth: server-side only (no ADMIN_EMAILS in client bundle)
- Login rate limiting: persisted in sessionStorage
- SW denylist: /dashboard, /tracker, /coach, /account, /admin

## STILL NEEDS MANUAL ACTION (Dashboard Access Required)
1. Stripe Dashboard: Change branding AMIRIS → pptides
2. Supabase Dashboard: Verify Pro plan (not Free)
3. Supabase Dashboard: Arabic auth email templates
4. Resend Dashboard: Verify domain + inbound webhook
5. Google Search Console: Submit sitemap.xml
6. DNS: SPF/DKIM/DMARC for email deliverability
7. Vercel Dashboard: Verify all env vars
8. Visual check: og-image.png for Ravora branding
9. Test: Send email to contact@pptides.com, verify receipt
10. Stripe Dashboard: Verify all 11 webhook events registered
