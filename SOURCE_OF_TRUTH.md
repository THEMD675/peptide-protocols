# pptides.com — Single Source of Truth
# Last updated: March 1, 2026

## Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Auth/DB**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Payments**: Stripe (Checkout Sessions API + Webhooks + Customer Portal)
- **Email**: Resend
- **AI**: DeepSeek (deepseek-chat model)
- **Hosting**: Vercel
- **Domain**: pptides.com

## Real Data (as of March 1, 2026)
- **Real subscribers**: 1 (trial/essentials with Stripe ID)
- **Test subscribers**: 1 (test-elite, no Stripe ID — excluded from MRR)
- **Real MRR**: $0 (trial hasn't converted)
- **Community posts**: 0
- **Reviews**: 0
- **Injection logs**: 0
- **Enquiries**: 0
- **Auth users**: ~55 (mix of real signups + test/unconfirmed)
- **Verified users**: only those with email_confirmed_at
- **GA4**: NOT ACTIVE (needs VITE_GA4_ID env var)
- **Sentry**: NOT ACTIVE (needs VITE_SENTRY_DSN env var)
- **Health check cron**: NOT SCHEDULED (function exists, needs Supabase cron job)

## Pricing
- Essentials: $9/month (annual $79/year)
- Elite: $99/month (annual $790/year)
- 3-day free trial on all plans (card required)
- 3-day money-back guarantee

## Admin Access
- URL: pptides.com/admin
- Allowed emails: abdullahalameer@gmail.com, contact@pptides.com
- Shows: verified users only, Stripe-verified MRR only

## Routes (22 pages)
| Route | Auth | Purpose |
|---|---|---|
| / | No | Landing (redirects to /dashboard if subscribed) |
| /login | No | Login/signup |
| /signup | No | Same as /login |
| /library | No | 41 peptide cards |
| /peptide/:id | No | Peptide detail + protocol card |
| /calculator | No | Dose calculator (free tool) |
| /quiz | No | Goal-finding quiz |
| /stacks | No | Curated peptide stacks |
| /lab-guide | No | Lab test guide |
| /guide | No | Injection guide |
| /pricing | No | Pricing page |
| /reviews | No | Public reviews |
| /table | No | Peptide comparison table |
| /sources | No | Scientific references |
| /community | No | User experiences |
| /interactions | No | Interaction checker |
| /glossary | No | Terminology |
| /privacy | No | Privacy policy |
| /terms | No | Terms of service |
| /dashboard | Yes | Main dashboard |
| /tracker | Yes | Injection logging |
| /coach | Yes | AI coach chat |
| /account | Yes | Account management |
| /admin | Yes + email whitelist | Admin dashboard |

## Edge Functions (10)
| Function | Trigger | External API |
|---|---|---|
| stripe-webhook | Stripe webhook POST | Stripe, Resend |
| ai-coach | Client POST | DeepSeek |
| create-checkout | Client POST | Stripe |
| create-portal-session | Client POST | Stripe |
| cancel-subscription | Client POST | Stripe, Resend |
| delete-account | Client POST | Stripe, Resend |
| send-welcome-email | Client POST (signup) | Resend |
| trial-reminder | Cron job POST | Resend |
| admin-stats | Client GET (admin) | Supabase Auth Admin |
| inbound-email | Resend webhook POST | Resend |

## Database Tables (15)
| Table | Real Data | Writers | Key Columns |
|---|---|---|---|
| subscriptions | 1 row | stripe-webhook, create-checkout | user_id, status, tier, stripe_subscription_id |
| injection_logs | 0 rows | Tracker page | user_id, peptide_name, dose, logged_at |
| user_protocols | 1 row | ProtocolWizard | user_id, peptide_id, dose, frequency, status |
| community_logs | 0 rows | Community page | user_id, peptide_name, goal, results, rating |
| reviews | 0 rows | Reviews page | user_id, rating, content, is_approved |
| reports | 0 rows | Community page | user_id, target_type, target_id |
| ai_coach_requests | 0 rows | ai-coach function | user_id, created_at |
| processed_webhook_events | rows | stripe-webhook | event_id, event_type |
| sent_reminders | rows | trial-reminder | user_id, reminder_type |
| email_list | 1 row | EmailCapture | email |
| enquiries | 0 rows | Account page | user_id, subject, peptide_name, message, status |
| referrals | 0 rows | AuthContext (signup) | referrer_id, referral_code, status |
| user_profiles | 0 rows | Not yet in UI | display_name, age, weight_kg, goals |
| wellness_logs | 0 rows | Not yet in UI | energy, sleep, pain, mood (1-5) |
| lab_results | 0 rows | Not yet in UI | test_id, value, unit |

## Email Types (8)
1. Welcome email (signup)
2. Payment confirmation (checkout.session.completed)
3. Payment failed (invoice.payment_failed)
4. Trial ending (customer.subscription.trial_will_end)
5. Cancellation confirmation (cancel-subscription)
6. Account deletion (delete-account)
7. Refund confirmation (charge.refunded)
8. Trial lifecycle reminders (6 types: day1, last_day, expired, day7, day14, day30)

## Features Built in This Conversation
1. Admin dashboard with user search, review moderation, enquiry management
2. Stripe Customer Portal for billing management
3. Referral system with codes and tracking
4. Quiz page for logged-in users
5. Peptide enquiry form on Account page
6. Milestone progress bar on Dashboard
7. Personalized recommendations on Library
8. Time-based greeting on Dashboard
9. Annual pricing display on Pricing page

## Bugs Fixed: 95+
All documented in commit history on main branch.
