# pptides.com — Operations Runbook
# 100 items for zero-downtime, white-glove service

## A. MONITORING (items 1-20)
1. Health check endpoint: /functions/v1/health-check — checks DB, Auth, Stripe, Resend, DeepSeek
2. Health check sends alert email on failure to contact@pptides.com
3. Run health check on schedule (set up cron in Supabase dashboard)
4. Admin dashboard shows real-time user count, MRR, errors
5. Sentry configured for frontend error capture (needs VITE_SENTRY_DSN)
6. Edge function errors logged with structured JSON format
7. Stripe webhook failures return 500 so Stripe retries
8. Payment polling has 20-attempt timeout with support email fallback
9. All fetch calls have 15-20s timeouts (won't hang forever)
10. Console errors tracked — zero errors on all 20 pages (verified)
11. Service worker update detection with user notification
12. Visibility change listener re-validates session on tab return
13. Trial expiration detected every 5 minutes for active trial users
14. Webhook deduplication prevents duplicate processing
15. Rate limiting on AI coach (10 req/60s per user)
16. RLS policies verified on all 15 tables
17. All Supabase queries check .error before using data
18. All forms have loading states and disabled buttons during submit
19. Network errors show specific Arabic messages (not generic)
20. Auth token expiry detected and user signed out gracefully

## B. DEPLOYMENT (items 21-40)
21. Vercel auto-deploys from git push to main
22. Service worker has cleanupOutdatedCaches: true
23. PWA update toast shows when new version available
24. Static assets cached immutably (1 year, content-hashed filenames)
25. API calls use NetworkOnly (never serve stale API data from cache)
26. Lazy-loaded page chunks — failed chunk loads auto-retry once
27. ErrorBoundary catches React crashes and shows retry button
28. RouteErrorBoundary per-route — one page crash doesn't kill the app
29. Build verified with tsc --noEmit + vite build before every deploy
30. Edge functions deployed individually: supabase functions deploy <name>
31. Database migrations applied via supabase db push
32. Environment variables set in Supabase dashboard (not in code)
33. CORS configured per-function with production domain whitelist
34. Vercel security headers: CSP, HSTS, X-Frame-Options DENY
35. robots.txt blocks /account, /dashboard, /tracker, /login, /signup
36. Sitemap.xml includes all public pages
37. OG image and meta tags on all pages
38. favicon, apple-touch-icon, PWA icons all pptides branded
39. Google Fonts loaded with display=swap (no FOIT)
40. Build chunks: vendor, supabase, ui, sentry (optimal splitting)

## C. ERROR HANDLING (items 41-60)
41. Every Supabase .insert/.update/.delete checks .error
42. Every fetch() has try/catch with user-facing error message
43. Every form has validation before submit (required fields, formats)
44. Every modal has Escape key handler and body scroll lock
45. Every async operation has loading state shown to user
46. Payment flow: 20-attempt polling with exponential backoff
47. Auth flow: specific error messages for every Supabase error code
48. Email flow: all sends are awaited (not fire-and-forget) for critical emails
49. Webhook flow: returns 500 on DB failure so Stripe retries
50. Coach streaming: AbortController with 60s timeout
51. Coach retry: messagesRef synced before re-send (no race condition)
52. File upload: none in app (no upload vulnerabilities)
53. localStorage: all reads in try/catch (Safari private mode)
54. sessionStorage: all reads in try/catch
55. JSON.parse: all calls in try/catch with fallback
56. URL params: validated against allowlists before use
57. Referral codes: validated format PP-XXXXXX before DB write
58. Email capture: format + length validated before insert
59. Injection dates: future dates blocked
60. Protocol end: requires confirmation dialog

## D. DATA INTEGRITY (items 61-80)
61. Subscriptions: only Stripe-verified rows count for MRR
62. Users: only email-confirmed count as "verified"
63. Admin dashboard: separates real data from test/manual
64. GDPR export: includes 5 tables (logs, protocols, reviews, community, subscriptions)
65. Account deletion: cleans 13+ tables, cancels Stripe, deletes auth user
66. Webhook idempotency: processed_webhook_events table prevents duplicates
67. Trial duration: fixed at 3 days (server-side, not client-controlled)
68. Subscription status: mapped from Stripe status (not user-editable)
69. Reviews: is_approved=false by default, requires admin approval
70. Community posts: user_id from auth (not user input)
71. Injection logs: user_id from auth, dose validated, site validated
72. Referrals: tracked via DB, not localStorage
73. Cancel: sets cancel_at_period_end (access preserved until period end)
74. Stripe incomplete status: maps to expired (no access before payment)
75. Past-due grace: 7 days after current_period_end
76. Double-subscribe blocked: create-checkout rejects active/trial users
77. Double-submit blocked: all forms have ref guards + disabled buttons
78. Optimistic deletes: rollback on failure with original position
79. Active protocols limited to 20 per query
80. Pagination: injection logs fetched in pages of 50

## E. USER EXPERIENCE (items 81-100)
81. Time-based greeting: صباح الخير / مرحبًا / مساء الخير
82. Personalized subtitle based on active protocols
83. Journey stats: total injections, streak, active protocols
84. Milestone progress bar: next achievement (10, 25, 50, 100, 250)
85. Protocol progress: week X of Y, days remaining
86. Adherence bar: shows compliance percentage
87. Injection site rotation: body map with suggested site
88. Dose validation: warns if above/below recommended range
89. "Recently viewed" peptides on Library page
90. "Recommended for you" based on quiz answers
91. Referral section with share via WhatsApp + copy link
92. Annual pricing visible: Essentials $79/yr, Elite $790/yr
93. 44px minimum touch targets on all interactive elements
94. Body scroll lock on all modals
95. Safe area padding for iPhone notch/home indicator
96. iOS input zoom prevention (16px font size)
97. RTL layout with logical CSS properties throughout
98. Arabic numerals with ar-u-nu-latn locale
99. No emojis — all elements use Lucide icons or plain text
100. Medical disclaimer on every protocol page and in footer
