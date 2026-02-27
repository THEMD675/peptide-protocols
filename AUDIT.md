# pptides.com — Master Audit Document
# 419 Actionable Items (deduplicated, already-fixed items removed)
# Generated: Feb 27, 2026

---

## CATEGORY 1: SECURITY (31 items)

1. Rate limiting in ai-coach uses in-memory map — resets on cold start, effectively non-functional
2. Trial-reminder cron endpoint open to anyone when CRON_SECRET env var not set
3. Stripe webhook tier fallback threshold wrong — $50 (5000 cents) instead of $99 (9900 cents)
4. Delete-account doesn't delete Stripe customer object — PII persists in Stripe
5. Cancel-subscription sets DB status 'cancelled' immediately while Stripe keeps access until period end — status mismatch
6. Client sends `role: 'system'` messages to AI coach — can override system prompt
7. localStorage stores unencrypted health data (coach history, injection logs, quiz answers)
8. Google OAuth redirectTo constructed from query string — open redirect risk
9. No CSRF protection on any endpoint
10. No Content-Security-Policy header
11. Community report button directly mutates rating to 0 — any user can destroy any post
12. Reviews auto-approve at rating >= 4 — positive reviews bypass moderation, negative silently hidden
13. Email capture has no rate limiting — bot can spam email_list table
14. Password minimum length is 6 — industry standard is 8+, no complexity requirements
15. Account deletion has no re-authentication (password re-entry)
16. Account password change doesn't require current password
17. AI coach allows unlimited request body size
18. supabase.ts throws at module level if env vars missing — crashes entire app
19. Supabase anon key exposed in client (expected but worth noting)
20. trial_ends_at calculated client-side — user can change system clock
21. CORS allows localhost:3000/3001 in production edge functions
22. No request ID or correlation ID for debugging edge functions
23. Stripe webhook has no event deduplication — duplicate events process twice
24. DNS-prefetch in index.html exposes Supabase project ID
25. GA4 script injected without nonce attribute
26. No bot-specific rules in robots.txt (GPTBot, CCBot)
27. delete-account order of operations: deletes data before auth user — partial delete if auth fails
28. No soft-delete with recovery period for account deletion
29. AI coach conversation data (health info) sent to DeepSeek with no privacy controls
30. WhatsApp share in Coach sends first 500 chars of protocol — accidental health data exposure
31. No GDPR data export option before account deletion

## CATEGORY 2: LOGIC BUGS (42 items)

32. Tracker.tsx: `logs[0].injected_at` should be `logged_at` — crashes stats dashboard
33. Trial access mismatch: Library uses array index `i < 6`, PeptideDetail uses hardcoded ID list
34. TrialBanner: cancelled-but-active banner is dead code (isPaidSubscriber early return)
35. TrialBanner: status='none' falls through all conditions — no blocking modal
36. AuthContext: payment polling only checks 'active', misses 'trial' status
37. AuthContext: 'past_due' status maps to 'none' — instant access revocation
38. AuthContext: 5-second timeout can cause flash of wrong UI state
39. Streak shows 0 until today's injection is logged — starts from today not yesterday
40. Dashboard totalInjections capped at 30 (limit on query)
41. Tracker stats recalculate on paginate — numbers jump as user loads more
42. DoseCalculator: mcg↔mg conversion has floating point precision issues
43. DoseCalculator: division by zero possible with 0 water volume
44. InteractionChecker: phantom 'mk-677' ID doesn't exist in peptides data
45. InteractionChecker: missing GHRP-2 and GHRP-6 from GH peptides list
46. InteractionChecker: 9 missing dangerous combos (retatrutide+GLP1, IGF1+all-GH, FOXO4+*)
47. InteractionChecker: same peptide selectable in two slots
48. InteractionChecker: default "آمن على الأرجح" gives false safety for unknown combos
49. Coach: __ERROR__ messages persist in localStorage — broken UI on return
50. Coach: message limit bypassed by resetting conversation
51. Coach: if AI returns empty, retry re-sends system prompt not user question
52. Library: Arabic diacritics in search — "تعافٍ" won't match "تعافي"
53. PeptideDetail: back button uses history.length which includes external sites
54. Login: password recovery navigates to /dashboard regardless of subscription status
55. Login: handleUpdatePassword setTimeout leaks on unmount
56. Landing: both hero CTAs identical for logged-in users
57. Landing: user count query counts ALL subscriptions not just active
58. Pricing: loadingPlan never resets if upgradeTo fails silently
59. Pricing: isSubscribedTo only checks 'active', misses 'trial'
60. Account: email validation only checks includes('@')
61. Account: cancel uses setTimeout → window.location.reload
62. AuthContext: logout does full page reload instead of SPA navigation
63. AuthContext: iterating localStorage while modifying keys
64. Stripe webhook: checkout.session.completed and subscription.created race condition
65. Tracker: timezone-dependent streak calculation — travel breaks streaks
66. Tracker: injectedAt initialization can fail around DST transitions
67. Stacks: getPrimaryCategory only checks first peptide ID
68. Guide: SVG label "الذراع" at x=20 may clip on small screens
69. Community: submittingRef and submitting state can desync on unmount
70. Reviews: fetchReviews retry button doesn't pass signal — state update on unmounted
71. PeptideQuiz: rapid clicks during handleSelect could cause stale state
72. Cancel-subscription: no mutex — double-click races
73. AI coach token limit 2400 too low for detailed protocols

## CATEGORY 3: UX ISSUES (89 items)

74. AgeGate: rejected state is dead end — no way out, no redirect
75. LabGuide: safety-critical red flags are paywalled
76. Reviews: low-rating reviews silently hidden with success message
77. No redirect after payment success — user stuck on pricing page
78. Trial users can't cancel from Account page
79. Pricing shows 'start trial' button to users already on trial
80. ExitIntentPopup shows on /login, /pricing, /signup — conversion pages
81. DoseCalculator disconnected from Tracker — no "log this" button
82. Community: no pagination — only first 50 posts
83. Community: no empty state when filter yields 0 results
84. Community: no sort functionality (by date, rating)
85. Community: success message auto-dismisses in 3 seconds — too fast
86. InteractionChecker: no guidance when <2 peptides selected
87. InteractionChecker: no instruction text explaining what the tool does
88. PeptideQuiz: "بشرة/أمعاء/نوم" lumps 3 different goals
89. PeptideQuiz: alternative peptide (altId/altName) computed but never shown
90. PeptideQuiz: no animation between steps
91. PeptideQuiz: no back button on result screen
92. PeptideTable: header not sticky vertically — loses context on scroll
93. PeptideTable: no column sorting
94. PeptideTable: no scroll indicators on mobile
95. PeptideDetail: protocol card too long on mobile — needs collapsible sections
96. PeptideDetail: no loading state for PeptideExperiences — layout shift
97. BackToTop: fixed 72px offset wrong for Pro users (StickyScrollCTA hidden)
98. StickyScrollCTA: close button touch target ~28px — below 44px minimum
99. ExitIntentPopup: close button touch target ~28px
100. ExitIntentPopup: useless on mobile (no mouseleave event)
101. ExitIntentPopup: no Escape key handler
102. ExitIntentPopup: no body scroll lock
103. Header: search hidden on mobile — non-discoverable
104. Header: user dropdown touch target ~36x28px — below 44px
105. Header: no transition animation on dropdown open
106. Header: mobile drawer doesn't animate hamburger → X
107. Header: search dropdown w-72 too narrow for Arabic
108. Header: search empty state has no suggestion/link
109. Header: logout has no confirmation
110. Header: login CTA text-xs on mobile — too small
111. Login: no "show password" toggle
112. Login: no "confirm password" for signup
113. Login: "forgot password" button below field — easily missed
114. Dashboard: displays email prefix as name — not a real name
115. Dashboard: getting-started checklist in localStorage — lost on browser reset
116. Dashboard: time abbreviations "د" "س" "ي" may confuse users
117. Stacks: "ابدأ البروتوكول" links only first peptide — stack has multiple
118. Stacks: protocol text at text-xs (12px) — too small for medical info
119. Account: no data export option before deletion
120. Account: delete has no type-to-confirm safety guard
121. Account: "upgrade" shown for cancelled — should say "resubscribe"
122. Landing: too many competing CTAs (6+ subscribe buttons)
123. Landing: no loading/skeleton while data fetches — content pops in
124. Footer: cookie management does full page reload instead of modal
125. Footer: WhatsApp link has no phone number — opens empty picker
126. CookieConsent: appears immediately — competes with AgeGate
127. CookieConsent: reject button is just underlined text — easy to miss
128. CookieConsent: z-index conflicts with StickyScrollCTA
129. Three fixed-bottom elements compete for space (Cookie, Sticky, BackToTop)
130. ScrollToTop: instant jump is jarring on long pages — should smooth scroll
131. ProtectedRoute: redirect to login has no explanatory message
132. Pricing: no annual pricing option
133. Pricing: Elite card appears first on mobile — Essentials should lead
134. Stacks: blur paywall lets keyboard users tab into blurred content
135. Toaster position top-center may overlap with TrialBanner
136. PageLoader spinner h-6 w-6 too small for full-page loader
137. ErrorBoundary: reload button has no loading state
138. RouteErrorBoundary: reset can loop if child keeps erroring
139. TrialBanner: paywall modal has no dismiss/back button
140. TrialBanner: trial countdown banner has no dismiss option
141. TrialBanner: no animation on appearance
142. Coach: chat max-height 560px too restrictive on large screens
143. Coach: intake wizard has no back to previous step
144. Coach: reset requires double-click — accident-prone
145. DoseCalculator: 30 preset buttons overwhelming on mobile — no search
146. DoseCalculator: saved calculations limited to 5 — no management
147. DoseCalculator: no URL state sync for sharing calculations
148. Glossary: no alphabetical grouping or letter navigation
149. Sources: only 5 references listed — landing claims "85+ مصدر"
150. Sources: no actual supplier list despite page title implying it
151. No breadcrumb navigation on any page
152. No offline detection or fallback
153. No PWA/service worker support
154. Auth polling: no backoff — constant 3-second intervals
155. Auth polling: after 15 failures shows vague message — no retry button
156. Payment polling: no redirect to dashboard after success
157. No Web Vitals reporting
158. No GA4 SPA page view tracking — only initial load tracked
159. Tracker: no batch delete operations
160. Tracker: no reminder/scheduling for upcoming injections
161. Tracker: no chart/graph of injection frequency
162. Community: report button silently fails for non-logged-in users

## CATEGORY 4: ACCESSIBILITY (92 items)

163. PageLoader: no role="status" or aria-label
164. ErrorBoundary: no role="alert" or aria-live="assertive"
165. Skip-link CSS exists but actual <a> element never rendered
166. Skip-link positioned with left/transform — wrong for RTL
167. index.html skip-link href="#main-content" but no element with that ID
168. AgeGate: no aria-labelledby on dialog
169. AgeGate: Shield icon no aria-hidden
170. AgeGate: rejected state — keyboard user trapped with no actionable elements
171. AgeGate: "under 18" button text amber-400 on dark bg — fails WCAG AA contrast
172. AgeGate: no body scroll lock when open
173. Header: mobile drawer has no FocusTrap
174. Header: dropdown no role="menu", items no role="menuitem"
175. Header: "المزيد" button no aria-expanded
176. Header: dropdown no aria-label or aria-labelledby
177. Header: mobile search input no aria-label
178. Header: search results no role="listbox" or aria-activedescendant
179. Header: mobile drawer inert attribute may not work in React
180. Header: "uppercase tracking-wider" has no effect on Arabic text
181. Footer: three <nav> elements with no aria-label — indistinguishable
182. Footer: no aria-current="page" on links
183. CookieConsent: no role="alertdialog" or role="banner"
184. CookieConsent: text-xs too small for legal text
185. CookieConsent: reject button no distinct focus style
186. CookieConsent: no focus trap or focus management
187. CookieConsent: no Escape key handler
188. ExitIntentPopup: no role="dialog" or aria-modal
189. ExitIntentPopup: no aria-labelledby/describedby
190. ExitIntentPopup: no focus trap
191. EmailCapture: privacy link text-[10px] — below WCAG minimum 12px
192. EmailCapture: text-white/30 contrast ratio ~1.3:1 — massively fails WCAG
193. EmailCapture: form no aria-label or legend
194. PeptideQuiz: no aria-live region for step transitions
195. PeptideQuiz: options no aria-pressed or aria-selected
196. PeptideQuiz: progress bar no role="progressbar"
197. ProtectedRoute: loading spinner no role="status"
198. ProtectedRoute: no timeout on loading state
199. StickyScrollCTA: no role="complementary" or aria-label
200. StickyScrollCTA: no screen reader announcement on appear
201. TrialBanner: paywall modal lacks aria-labelledby/describedby
202. TrialBanner: gold-gradient banner text contrast may fail
203. Login: error messages no role="alert"
204. Login: tab buttons no role="tab"/tabpanel pattern
205. Login: password strength bar no role="progressbar"
206. Login: form inputs no aria-describedby for errors
207. Library: search no role="searchbox"
208. Library: filter buttons no aria-pressed
209. Library: locked cards no tooltip explaining why locked
210. PeptideDetail: protocol table rows no th scope="row"
211. PeptideDetail: share button no aria-label
212. PeptideDetail: inline calc no aria-live for results
213. PeptideDetail: star ratings use color only
214. DoseCalculator: SVG syringe content not accessible beyond label
215. DoseCalculator: expandable section no aria-expanded
216. DoseCalculator: InputField has redundant aria-label overriding visible label
217. Coach: chat container no role="log" or aria-live
218. Tracker: calendar chevrons may confuse in RTL
219. Tracker: delete dialog no initial focus management
220. Dashboard: calendar squares use title attribute — screen readers may not read
221. Dashboard: trial urgency no role="alert"
222. Pricing: FAQ details/summary may lose aria-expanded with custom styling
223. Pricing: trust badges horizontal layout wraps awkwardly
224. Pricing: medical disclaimer text-xs too small
225. Account: cancel dialog no aria-labelledby
226. Stacks: blurred content keyboard-accessible despite being hidden
227. LabGuide: tables no <caption> elements
228. LabGuide: white text on emerald-500 header — contrast concern
229. LabGuide: blurred text readable by screen readers
230. Guide: SVG text may not be read by screen readers
231. Guide: reconstitution steps use spans not ol/li
232. Community: rating dots too small (8px)
233. Community: submit button disabled relies on opacity only
234. Reviews: htmlFor points to div not form element
235. Reviews: StarRating no role="radiogroup"
236. Reviews: "مستخدم موثّق" badge on all reviews with no verification
237. PeptideTable: table headers no scope="col"
238. PeptideTable: blurred content readable by screen readers
239. PeptideTable: sticky banner may overlap nav
240. InteractionChecker: disclaimer text too small and low contrast
241. Glossary: should use dl/dt/dd not article/h3/p
242. Glossary: border-r-2 should be logical property for RTL
243. Sources: external links no new-window indicator for screen readers
244. Privacy: back arrow ← wrong direction for RTL
245. Terms: same RTL arrow issue
246. BackToTop: no tooltip explaining purpose
247. No focus management on route changes — screen readers not notified
248. Loading spinners inconsistent across 8+ pages
249. min-h-[50vh] arbitrary value repeated with no shared class
250. No lang="ar" set via React (only in index.html)
251. Paywall blur content in DOM and readable by assistive tech
252. font-size: 16px hardcoded in px — doesn't respect user preferences
253. prefers-reduced-motion sets 0.01ms not 0ms
254. No @font-face for Cairo — relies on external Google Fonts load

## CATEGORY 5: PERFORMANCE (48 items)

255. Sentry 452KB imported statically even when cookies rejected
256. peptides.ts (1325 lines) imported by Header, TrialBanner, PeptideQuiz — all in main bundle
257. No React.memo on any component — Header/Footer re-render on every route
258. Header searchResults computed every render without useMemo
259. Header scroll handler sets state without requestAnimationFrame/throttle
260. Coach renderMarkdown called every render for every message without memo
261. Coach localStorage.setItem called on every character streamed in
262. Library PeptideCard not wrapped in React.memo
263. Library useUsedPeptides fetches ALL injection_logs just for peptide names
264. Landing: stats bar inline array re-created every render
265. Landing: steps and testimonials arrays created inline in JSX
266. PeptideDetail: InlineDoseCalc recalculates every render without useMemo
267. PeptideQuiz: allPeptides.find is O(n) — should use Map
268. InteractionChecker: sortedPeptides re-sorts every render
269. TrialBanner: peptides.find runs every render
270. ExitIntentPopup: mouseleave listener registered entire app lifecycle
271. AuthContext: context value object created every render — all consumers re-render
272. AuthContext: fetchWithRetry uses linear backoff instead of exponential
273. AuthContext: payment polling constant 3s intervals — no backoff
274. DoseCalculator: results useMemo depends on object reference defeating memo
275. No list virtualization for 41 peptide cards
276. No loading skeletons — all pages show spinners
277. glass-card transition: all causes transitions on every property
278. index.css * { margin/padding/box-sizing } duplicates Tailwind preflight
279. index.css border-color on * overrides defaults on hr/table/fieldset
280. shimmer keyframe defined but never used
281. No image optimization plugin in Vite
282. No compression plugin in Vite
283. og-image.png is 164KB — should be optimized
284. No build target specified in Vite
285. AgeGate, CookieConsent, ExitIntentPopup, StickyScrollCTA all eagerly loaded
286. 12 icon imports in PeptideQuiz — some only used in specific steps
287. PeptideTable useMemo with empty deps — fragile
288. No code splitting beyond lazy page routes
289. Font loaded via Google Fonts with no fallback font-display
290. No service worker for caching
291. CSS file 282 lines — should be split into partials
292. No Web Vitals reporting
293. Community filter applied in render without useMemo
294. DoseCalculator: 30 preset buttons rendered simultaneously
295. Guide: SVG_COLORS recreated every render (before my fix)
296. Library: evidenceOrder recreated every render (before my fix)
297. Multiple pages import full peptides array when they only need names/IDs
298. Tracker: stats calculated inside IIFE on every render without useMemo
299. Dashboard: useRecentActivity over-fetches (30 records, displays 5)
300. No request size limit on ai-coach endpoint
301. trial-reminder queries ALL trial users with no date filter
302. trial-reminder N+1 getUserById calls

## CATEGORY 6: STYLE / DESIGN CONSISTENCY (52 items)

303. CSS variable --gold is actually emerald green — misleading name
304. CSS variable --gold-light same issue
305. CSS variable --navy legacy name not matching design
306. CSS variable --cream is just white
307. gold-gradient class renders emerald — misleading
308. gold-border class same issue
309. body line-height 1.8 unusually large — 1.5-1.6 standard
310. Inconsistent border radii: mix of rounded-xl, rounded-2xl, rounded-lg, rounded-full
311. Body text color inconsistent: text-stone-800, text-stone-600, text-stone-700 on different pages
312. Paywall CTA buttons inconsistent: gold-gradient vs bg-emerald-600, rounded-lg vs rounded-full
313. PeptideTable category icons use emoji while Library uses Lucide icons
314. Community rating uses dots while Reviews uses stars
315. "بيبتايد" in Reviews meta vs "ببتيد" everywhere else
316. InteractionChecker uses "Stack" in Arabic context — should be "التجميعة"
317. Gulf Arabic ("وش", "مش") mixed with MSA ("ماذا", "يرجى")
318. Stacks protocol font text-xs (12px) too small for medical info
319. Header guestNavLinks uses full name, userNavLinks uses abbreviation
320. Footer security badges text-xs text-stone-500 — low contrast
321. Footer WhatsApp encoded Arabic — hard to maintain
322. EmailCapture dark: variants duplicate base styles
323. Scrollbar styling webkit-only — no Firefox/Edge fallback
324. Pricing "الأفضل قيمة" badge may overlap content above
325. Guide paywall CTA uses different style than other paywalls
326. PeptideTable emoji icons render differently across platforms
327. Account loading indicator is just "..." — should be spinner
328. Header logo links /dashboard for logged-in users — convention is home
329. Header active indicator uses fragile calc() in arbitrary value
330. Header avatar small h-8 w-8 on mobile
331. Header login CTA py-1.5 too small on mobile
332. TrialBanner top offset hardcoded to match header height
333. Spacer div in Header duplicates header height — fragile
334. Dashboard activity stat cards use 4 different icon colors
335. Dashboard 10-column calendar grid may break on narrow screens
336. PeptideDetail: inconsistent padding across sections
337. Footer nav links duplicate Header links — should share constants
338. Multiple inline SVGs should be reusable icon components
339. evidence badge classes use @apply — could be inline Tailwind
340. Browser scrollbar width 6px — may feel too thin
341. PeptideQuiz step 2 has no icons while steps 1 and 3 do
342. PeptideQuiz progress bar h-1.5 too thin
343. PeptideQuiz option label text-xs too small
344. Privacy/Terms use native list-disc — doesn't match app's styled lists
345. Sources email link has empty className
346. LabGuide bg-[var(--card)] may not be defined
347. Glossary border-r-2 for accent — wrong side in RTL
348. Stacks glass-card gold-border classes used inconsistently
349. ProtectedRoute spinner uses border-4, PageLoader uses border-3
350. Logo "pp" + "tides" duplicated in 4+ places — should be <Logo /> component
351. min-h-[50vh] repeated in error boundaries and ProtectedRoute
352. NotFound component 30+ lines inline in App.tsx
353. ExitIntentPopup "لا شكرًا" dismiss is plain text
354. Pricing disclaimer text too small for legal text

## CATEGORY 7: COPY / CONTENT (34 items)

355. $314+ value stack total hardcoded in Landing and Pricing
356. $305 savings hardcoded in Landing
357. $292+ savings hardcoded in Pricing
358. "41" hardcoded in Account cancel dialog
359. "41" hardcoded in send-welcome-email body
360. "3 أيام" trial days hardcoded in ExitIntentPopup and StickyScrollCTA
361. contact@pptides.com hardcoded in 8+ files
362. 7-day popup cooldown hardcoded
363. 30-minute CTA dismiss hardcoded
364. PEPTIDE_COUNT should derive from peptides.length
365. All 41 peptides have identical lastUpdated "Feb 2026" — not per-peptide
366. 6 cost mismatches between AI coach prompt and peptides.ts data
367. AI coach mentions MK-677 which isn't in the database
368. AI coach doesn't cover 13 peptides in its prompt
369. Semaglutide summary says "أقوى" but Tirzepatide achieves higher weight loss
370. BPC-157 evidence 'strong' but zero human RCTs
371. 5-Amino-1MQ evidence 'moderate' but animal-only like Dihexa ('weak')
372. TB-500 difficulty 'beginner' requires reconstitution + injection protocol
373. Ipamorelin difficulty 'beginner' requires fasting + timing + reconstitution
374. GHRP-2 missing warningAr despite cortisol/prolactin elevation
375. GHRP-6 missing warningAr despite blood sugar and extreme hunger
376. Hexarelin missing warningAr despite rapid tolerance
377. P21 missing warningAr despite zero human trials
378. 5-Amino-1MQ is not a peptide — included without type flag
379. GHK-Cu and Copper Peptides Topical heavily overlap — confusing
380. DSIP in longevity category but it's primarily a sleep aid
381. GH Stack protocol mentions CJC-1295 but peptideIds doesn't include it
382. Brain Stack protocol mentions NA-Semax-Amidate but peptideIds doesn't include it
383. Longevity protocol mentions DSIP/Thymalin but peptideIds doesn't include them
384. costEstimate mixed units (/شهر, /دورة, /جرعة) with no structured type
385. Privacy/Terms missing GDPR, governing jurisdiction, limitation of liability clauses
386. Terms says "لا نقدّم نصائح طبية" but Coach gives personalized protocols
387. trial-reminder email says "بعد غد" (day after tomorrow) when condition is daysUntilExpiry=1 (tomorrow)
388. Sources page claims "85+ مصدر" but only lists 5 references

## CATEGORY 8: STRUCTURE / ARCHITECTURE (42 items)

389. App.tsx defines 5 components in one file (PageLoader, ErrorBoundary, RouteErrorBoundary, ScrollToTop, CanonicalUrl, HomeRedirect, NotFound)
390. ErrorBoundary and RouteErrorBoundary share 80% identical code
391. Every route wrapped individually in RouteErrorBoundary — should be layout route
392. Coach.tsx 739 lines — renderMarkdown, intake, chat, actions in one file
393. DoseCalculator.tsx 931 lines — SyringeVisual, presets, reference table in one file
394. Landing.tsx 707 lines — should split into section components
395. No shared STORAGE_KEYS constant — 6+ localStorage keys scattered
396. No shared TRIAL_DAYS constant
397. No shared SITE_URL constant
398. evidenceColors/evidenceLabels/categoryLabels duplicated across Library, PeptideDetail, PeptideTable
399. STATUS_LABELS duplicated in Dashboard and Account
400. VALUE_STACK duplicated between Landing and Pricing
401. DOSE_PRESETS duplicated between DoseCalculator and PeptideDetail
402. Footer nav links duplicate Header nav links
403. InteractionChecker data (combos) should be in data file not component
404. PeptideQuiz getRecommendation is 50-line if/else — should be data-driven
405. No shared formatting utilities (formatDate, formatCurrency)
406. arPlural oversimplifies Arabic grammar for 11-99
407. No TypeScript database types — should use createClient<Database>()
408. No test files anywhere — zero test coverage
409. No CI/CD pipeline scripts
410. No pre-commit hooks (husky/lint-staged)
411. No Prettier configuration
412. package.json version "0.0.0"
413. package.json missing engines, license, description, browserslist
414. @types/dompurify in dependencies instead of devDependencies
415. tailwindcss-animate in dependencies instead of devDependencies
416. No @tailwindcss/typography plugin for prose/markdown
417. Sermorelin fdaApproved: false but text says "previously FDA-approved"
418. costEstimate typed as string — should be structured { min, max, unit }
419. lastUpdated, costEstimate, difficulty are optional but all 41 have them — should be required

---

# Priority for Execution

## Batch 1 — Security + Critical Bugs (items 1-73): ~60 fixes
## Batch 2 — UX Issues (items 74-162): ~89 fixes
## Batch 3 — Accessibility (items 163-254): ~92 fixes
## Batch 4 — Performance (items 255-302): ~48 fixes
## Batch 5 — Style/Design (items 303-354): ~52 fixes
## Batch 6 — Copy/Content (items 355-388): ~34 fixes
## Batch 7 — Structure/Architecture (items 389-419): ~31 fixes
## Batch 8 — User Journey Friction (items 420-499): ~80 fixes
## Batch 9 — Edge Cases & Error States (items 500-541): ~42 fixes
## Batch 10 — CSS/Tailwind Micro-Polish (items 542-704): ~163 fixes
## Batch 11 — Data Cross-Reference Mismatches (items 705-717): ~13 fixes
## Batch 12 — SEO/Marketing/Conversion (items 718-832): ~115 fixes

---

## CATEGORY 8: USER JOURNEY FRICTION (80 items)

420. No "What are peptides?" explainer for first-time visitors — landing assumes prior knowledge
421. No beginner pathway surfaced — guide/glossary buried in "More" dropdown
422. Quiz recommendation links to locked content for non-subscribers — user can't read what's recommended
423. Quiz alternative peptide (altId/altName) computed but never displayed
424. No protocol preview on quiz result — user gets name but no actionable info
425. Payment polling 45 seconds with no progress indicator — page feels frozen
426. No redirect to dashboard after successful payment — user stuck on pricing
427. No order confirmation email after payment
428. Trial requires card but messaging says "تجربة مجانية" without mentioning card
429. Interaction checker not linked from PeptideDetail pages — hard to discover
430. Interaction checker results have no links to peptide detail pages
431. Interaction checker can't pre-fill from Coach or PeptideDetail context
432. Calculator has no "Log this injection" button to bridge to Tracker
433. Calculator has no "How to inject" link to Guide
434. Calculator syringe "units" concept not explained for beginners
435. Tracker streak shows 0 until today's injection — kills motivation
436. Tracker has no injection reminders or notifications
437. Tracker has no protocol schedule builder — manual logging only
438. Tracker has no charts or graphs for injection frequency
439. Coach conversation not persisted server-side — lost on browser clear
440. Coach has no "X messages remaining" visible counter
441. Coach limit reached shows disabled input with no upgrade CTA
442. Coach intake skips steps when quiz answers in localStorage — user confused why
443. Cancel flow has no retention offer or pause option
444. Cancel FAQ says "email us" but cancel button exists — contradictory
445. No "resume subscription" button for cancelled-but-active users
446. Password reset doesn't check inbox/spam hint
447. Password reset navigates to /dashboard regardless of subscription status
448. Compare feature locked to subscribers — no indication it exists for free users
449. Compare has no shareable URL
450. No "For Healthcare Professionals" section for doctors/clinicians
451. No downloadable protocols for medical professionals
452. No per-peptide citation linking to sources
453. No proper medical schema markup (MedicalWebPage, Drug)
454. Mobile: StickyScrollCTA + CookieConsent + BackToTop all compete for bottom space
455. Mobile: search buried in hamburger menu — non-discoverable
456. Mobile: DoseCalculator syringe SVG too tall (400px)
457. No PWA install prompt despite apple-app-site-association file
458. Payment failure: no user notification, no "update payment" page, no Stripe billing portal
459. No self-service payment method update
460. Share button on PeptideDetail sends to locked page for recipients
461. No per-peptide social cards — generic og-image.png
462. No WhatsApp/Telegram share buttons (key for Arabic audience)
463. Community: report button is destructive (zeros rating) not a moderation flag
464. Community: no reply/comment/thread system
465. Community: no upvote/downvote
466. Community: paid-only posting reduces content volume
467. Colorblind: evidence levels rely heavily on color differentiation
468. Colorblind: community ratings use emerald dots — indistinguishable for deuteranopia
469. Screen reader: no skip-to-content link functional
470. Screen reader: brand name + peptide English names may cause pronunciation issues
471. Slow 3G: no skeleton UI — just spinners everywhere
472. Slow 3G: no progressive loading for library cards
473. Slow 3G: no service worker for caching
474. Slow 3G: no loading="lazy" on images
475. Delete account: no data export before deletion (GDPR requirement)
476. Delete account: no grace period — immediate permanent deletion
477. Delete account: no typed confirmation
478. Returning non-subscriber: no "welcome back" re-engagement
479. Returning non-subscriber: quiz answers expired from localStorage
480. Returning non-subscriber: free tools not surfaced on Dashboard
481. No onboarding flow after payment — user lands on empty dashboard
482. No email infrastructure beyond welcome email and trial reminders
483. No payment receipt email
484. No subscription cancelled email
485. No account deleted confirmation email
486. Age gate feels intimidating for educational site — unprofessional for medical context
487. Landing page fear-based first section may alienate learners
488. No intermediate pricing tier between $9 and $99
489. Pricing gap between Essentials ($9) and Elite ($99) is jarring
490. Quiz should be primary CTA for newcomers instead of pricing push
491. Getting-started checklist stored in localStorage — lost on browser reset
492. Dashboard shows email prefix as name — not an actual display name
493. Error boundaries show Arabic but brand/peptide names in English — jarring mix
494. No language consistency policy — Gulf Arabic mixed with MSA
495. Hero section has 6+ competing CTAs — dilutes conversion
496. Stacks "ابدأ البروتوكول" links only first peptide — stack has multiple
497. No Stripe billing portal integration
498. No "what to do first" guide after subscribing
499. Community auto-approval bias — only rating >= 4 shows, creating survivorship bias

## CATEGORY 9: EDGE CASES & ERROR STATES (42 items)

500. getSession has no retry — Supabase briefly down = user treated as unauthenticated
501. Welcome email fetch failure means trial fix never runs — user gets 7-day trial
502. Payment polling hangs if network drops — no error feedback
503. Coach SSE stream has no client-side timeout — hangs indefinitely on connection drop
504. Coach: all error types (429, 403, 502) produce same generic __ERROR__
505. Community initial load 8-second timeout shows empty list if query hangs
506. Tracker insert doesn't check response for errors — clears form on failure
507. Dashboard useRecentActivity catch doesn't set loading=false — infinite spinner
508. Account cancel/delete don't check session validity — empty token if expired
509. EmailCapture supabase.from() exception uncaught — component crashes
510. AI coach AbortSignal.timeout doesn't cover streaming phase
511. Stripe webhook returns 200 even if DB update fails — Stripe won't retry
512. send-welcome-email 2-second delay is a race condition — may not find subscription row
513. Invalid peptide ID in URL redirects silently — no 404 for SEO crawlers
514. Dashboard 30-log limit doesn't cover full 30-day calendar
515. Community: no length limit on results/protocol — 100,000+ chars possible
516. Library useFavorites: malformed JSON in localStorage silently wipes favorites
517. Library useUsedPeptides: unbounded query (no limit on injection_logs)
518. OAuth users without email treated as unauthenticated
519. PeptideExperiences ilike pattern could match unrelated peptides
520. Coach sendToAI double-click race window before isLoadingRef is set
521. Community re-fetch after submit may not include new post (read replica lag)
522. AuthContext getSession + onAuthStateChange race on token refresh
523. Tracker optimistic delete rollback + concurrent fetchLogs conflict
524. Account cancel setTimeout fires on wrong page if user navigates
525. Login tab: onAuthStateChange fires in background tab — redirects mid-typing
526. Safari Private Browsing: age gate re-shows every page load
527. localStorage full: DoseCalculator saves silently fail
528. Old browsers: inert attribute not supported — drawer focusable when closed
529. DOMPurify config change could break renderMarkdown silently
530. Age verified + cookie not consented = inconsistent state
531. Client subscription state diverges from server after cancel
532. buildSubscription timezone difference: trial shows 1 day when actually expired
533. Stripe webhook concurrent events: last write wins on subscription status
534. Coach message limit: client allows but server rejects after trial expires mid-conversation
535. Pricing isSubscribedTo misses trial — user can create duplicate subscription
536. delete-account: injection_logs deletion failure leaves orphaned data
537. TrialBanner: missing current_period_end from webhook makes paying user see expired modal
538. Coach localStorage 100+ messages = 200-400KB per conversation — no pruning
539. renderMarkdown: thousands of DOM nodes for long conversations — no virtualization
540. CSV export: 10,000+ logs builds entire string in memory
541. AI coach rateLimitMap grows unbounded in warm Deno instances

## CATEGORY 10: CSS/TAILWIND MICRO-POLISH (163 items)

542. Landing hero max-w-5xl vs Features max-w-6xl — content width misalignment
543. Landing Email Capture section py-20 vs other sections py-24 — inconsistent vertical rhythm
544. Landing h1 leading-[1.1] too tight for Arabic ascenders/descenders — min 1.3
545. Landing h1 tracking-tight harms Arabic connected character readability
546. Header search button px-2.5 py-2 = ~36px touch target — below 44px
547. Header hamburger p-2 = ~36px touch target — below 44px
548. Header login CTA text-xs py-1.5 = ~28px touch target — far below 44px
549. Header mobile drawer w-72 leaves only 32px backdrop visible at 320px
550. Header dropdown items px-4 py-2 = ~36px tall — below 44px
551. Header avatar h-8 w-8 (32px) small on mobile
552. ExitIntentPopup close button p-1.5 = ~27px touch target
553. StickyScrollCTA dismiss button p-1.5 = ~22px touch target
554. CookieConsent reject button has no padding — pure text touch target
555. Library favorite star button p-2 = ~32px touch target
556. Library compare toggle p-2 = ~32px touch target
557. Reviews interactive star buttons h-6 w-6 (24px) with no padding
558. Community report flag button p-2 = ~30px touch target
559. DoseCalculator preset buttons px-3 py-1.5 text-xs = ~28px tall
560. Coach copy button px-2 py-1 text-[11px] = ~24px touch target
561. Footer nav links gap-2 text-sm = ~20px tap targets
562. Landing stats bar grid-cols-2 at 320px cramped with p-8
563. Landing testimonials no line-clamp — long reviews blow out card height
564. DoseCalculator syringe w-[100px] h-[400px] takes 31% viewport at 320px
565. PeptideTable min-w-[1100px] = 3.4x scroll at 320px — needs card view for mobile
566. Coach chat max-h-[560px] fixed — exceeds viewport on iPhone SE
567. Coach intake grid-cols-2 at 320px with p-3 and icon+text very tight
568. Dashboard stats sm:grid-cols-4 in single column at 320px wastes space
569. Landing overflow-x-hidden is a band-aid — should fix root cause
570. PeptideTable no scroll indicator for horizontal scroll
571. Library category pills no scroll indicator
572. Landing How-It-Works arrow uses ArrowLeft — wrong direction for RTL
573. Landing feature hover text uses ← — wrong direction for RTL
574. DoseCalculator CrossLink uses ArrowLeft with wrong hover animation for RTL
575. index.css scroll-fade mask direction wrong for RTL
576. index.css skip-link uses left positioning — should use right for RTL
577. Coach ml-2 on avatar — should be ms-2 for RTL
578. Stacks uppercase tracking-wider has no effect on Arabic text
579. PeptideTable uppercase tracking-wider same issue
580. Landing border-stone-300/60 opacity vs Library border-stone-200 — no system
581. Account email card border-stone-200 vs subscription border-stone-300 on same page
582. Library card hover shadow-xl/10 vs Landing card hover shadow-lg — inconsistent
583. glass-card hover uses raw CSS box-shadow vs Tailwind utilities — dual system
584. AgeGate age-reject text-amber-400 on dark bg — fails WCAG AA contrast
585. EmailCapture text-[10px] privacy link — below WCAG minimum
586. EmailCapture text-white/30 contrast ratio ~1.3:1 — massively fails WCAG
587. PeptideQuiz option text-xs font-bold — 12px small for Arabic buttons
588. PeptideQuiz progress bar h-1.5 — thin, hard to see
589. Footer security badges text-xs text-stone-500 — low contrast
590. DoseCalculator overflow warning text-red-400 vs dose warning text-red-700 — same type different color
591. PeptideTable warning text-red-400 vs rest of site text-red-600
592. AgeGate Shield icon no explicit color — may be invisible on dark bg
593. z-index: AgeGate z-[9999] conflicts with skip-link z-[9999]
594. z-index: BackToTop z-50 same as Header — could overlap
595. z-index: StickyScrollCTA z-40 same as CookieConsent — stack conflict
596. z-index: Library modals z-50 same as Header
597. z-index: PeptideTable sticky banner z-50 covers header at top-0
598. body line-height 1.8 too loose for headings and badges
599. index.css * reset duplicates Tailwind preflight
600. index.css border-color on * overrides default hr/table/fieldset borders
601. shimmer keyframe defined but never used
602. No Firefox/Edge scrollbar styling — webkit only
603. prefers-reduced-motion 0.01ms should be 0ms
604. font-size 16px hardcoded in px — doesn't respect user preferences
605. transition: all on glass-card triggers layout transitions — specify properties
606. Privacy/Terms h1 text-2xl sm:text-3xl smaller than other pages text-3xl md:text-4xl
607. Landing section headings text-3xl vs Privacy h2 text-xl — hierarchy mismatch
608. Coach markdown h4 outputs text-sm — indistinguishable from body text
609. Stacks subtitle no explicit text size — inherits 16px too small relative to h1
610. Landing CTA gap-3 vs trust badges gap-6 — arbitrary spacing relationship
611. DoseCalculator results gap-4 vs inputs gap-5 — inconsistent within same card
612. Community form labels mb-1.5 vs field gaps mb-4 — inconsistent ratio
613. PeptideQuiz step 0 grid-cols-2 cramped at 320px with px-3 py-3
614. Landing responsive text text-lg md:text-xl only 2px difference — unnecessary breakpoint
615. Landing value stack price text-3xl to text-5xl to text-6xl — large jumps
616. DoseCalculator input unit label overlaps value with long numbers
617. Pricing gradient bg-gradient-to-r goes wrong direction in RTL
618. Header active indicator -bottom-[calc(theme(spacing.2)+1px)] fragile calculation
619. Header spacer div h-16 md:h-[72px] duplicates header height — fragile
620. TrialBanner top-[64px] md:top-[72px] hardcoded to match header
621. Landing text-right explicit — redundant since body is RTL
622. Gold-gradient class named gold but renders emerald green
623. Gold-border class same misleading name
624. --navy --cream CSS variables misleadingly named
625. Header guestNavLinks "حاسبة الجرعات" vs userNavLinks "الحاسبة" — inconsistent
626. PeptideTable uses emoji icons while Library uses Lucide icons
627. Community rating uses dots (h-2 w-2) while Reviews uses Star icons
628. ProtectedRoute spinner border-4 vs PageLoader border-3
629. No hover state on AgeGate under-18 button
630. No active state on Landing secondary CTA
631. No active state on PeptideQuiz option buttons
632. No active state on Library category filter buttons
633. No active state on DoseCalculator preset buttons
634. No active state on Community goal filter buttons
635. No active state on Sources reference links
636. No focus/active states on CookieConsent reject button
637. No focus/active states on Footer nav links
638. Coach copy button no explicit transition — defaults to 150ms vs app 300ms
639. PeptideTable hover transitions default 150ms vs card 300ms
640. No global icon size constants — h-3 h-3.5 h-4 h-5 h-6 h-7 used without system
641. Logo pptides text duplicated in 4+ places — should be Logo component
642. min-h-[50vh] arbitrary value repeated without shared class
643. NotFound component 30+ lines inline in App.tsx
644. border-3 not a standard Tailwind class — may render nothing
645. Dark mode CSS variables defined but never toggled
646. Evidence badge @apply classes could be inline Tailwind
647. Chart colors chart-1 through chart-5 defined but no charts exist
648. Brand colors brand-amber/gold/violet/cyan may be unused
649. Divider colors use var() without hsl() wrapper — inconsistent with other colors
650. Custom spacing space-1 through space-12 duplicate Tailwind system
651. glass-card transition: all — should specify transform, box-shadow, border-color
652. AgeGate no body scroll lock
653. ExitIntentPopup no body scroll lock
654. Header dropdown no appear/disappear transition
655. Header user dropdown no transition
656. TrialBanner no appearance animation
657. PeptideQuiz no step transition animation
658. Library upsell card md:col-span-2 but should be lg:col-span-3 on desktop
659. Coach min-h-[360px] may exceed viewport on iPhone SE 1st gen
660. DoseCalculator InputField unit suffix approach would be better than position:absolute
661. Pricing Elite card appears first on mobile — Essentials should lead for conversion
662. PeptideDetail protocol card too long on mobile — needs collapsible sections
663. Footer cookie management should show modal not full page reload
664. Various heading tags missing explicit text color — inherit unpredictably
665. Testimonial card avatar uses gold-gradient but should use emerald to match brand
666. Landing pulsing green dot has no accessible description
667. Landing trust badges icons no aria-label
668. Landing pain point X icons no alt text for screen readers
669. Landing star icons no aria-label
670. Landing section decorative gradients no aria-hidden
671. CookieConsent no Escape key handler
672. ExitIntentPopup no Escape key handler
673. ExitIntentPopup dismiss text too subtle
674. PeptideQuiz text-[10px] subtext below WCAG minimum
675. StickyScrollCTA text truncation cuts mid-word for Arabic
676. Tracker calendar chevron direction potentially confusing in RTL
677. DoseCalculator emoji warning icons should use components
678. Sources disclaimer bg-amber-500/[0.06] opacity may render inconsistently
679. Glossary border-r-2 accent should use logical property border-inline-start
680. Guide paywall CTA uses gold-gradient vs other pages bg-emerald-600
681. PeptideTable Stacks card glass-card gold-border inconsistent with other cards
682. Account loading indicator "..." should be spinner
683. Dashboard activity stats use 4 different icon colors vs emerald-only brand
684. Dashboard 10-column calendar may break on narrow screens
685. PeptideDetail inconsistent padding px-5 py-3 vs p-4 vs px-4 py-2
686. Landing fear-based first section may alienate educational visitors
687. BackToTop has no tooltip
688. Multiple overlapping fixed elements at bottom of screen on mobile
689. No loading skeleton components — all spinners lose layout continuity
690. No offline state detection or UI
691. No breadcrumb navigation visual component
692. Border radius mix: rounded-xl, rounded-2xl, rounded-lg, rounded-full — no system
693. Body text color mix: text-stone-800, text-stone-700, text-stone-600 — no system
694. Gulf Arabic dialect mixed with MSA across and within pages
695. Line-height 1.8 global but some elements override to leading-tight — jarring
696. No responsive font scaling system (fluid typography)
697. No design token documentation
698. No Storybook or component library
699. Tailwind darkMode ["class"] configured but unused
700. No RTL-specific testing documentation
701. No visual regression testing setup
702. index.css 282 lines mixes resets, variables, components, animations — should split
703. No postcss-rtl or tailwindcss-rtl plugin for automatic logical properties
704. No CSS custom property for header height — used in 3+ places as magic number

## CATEGORY 11: DATA CROSS-REFERENCE MISMATCHES (13 items)

705. InteractionChecker ghPeptides contains phantom mk-677 not in peptides array
706. InteractionChecker ghPeptides missing ghrp-2 and ghrp-6
707. AI coach Thymosin Alpha-1 frequency: 2x/week vs peptides.ts daily/every other day
708. AI coach GHK-Cu dose: 200mcg vs peptides.ts 1-2mg (5-10x mismatch)
709. AI coach Semaglutide cost: up to $300 vs peptides.ts up to $250
710. AI coach AOD-9604 cost: $80-120 vs peptides.ts $60-100
711. AI coach Collagen cost: $30-50 vs peptides.ts $20-40
712. AI coach CJC+Ipa combo cost: $100-150 vs sum $160-280
713. AI coach Larazotide+KPV combo cost: $100-150 vs sum $160-280
714. PT-141 nameEn 'PT-141 / Bremelanotide' vs DOSE_PRESETS key 'PT-141' — InlineDoseCalc broken
715. AI coach mentions MK-677 which isn't in the peptides database
716. AI coach doesn't cover 13 peptides in its prompt
717. Lab tests E2/SHBG/Lipid Panel in coach prompt but not in labTests array

## CATEGORY 12: SEO/MARKETING/CONVERSION (115 items)

718. Most pages have NO page-specific OG tags — fall back to generic
719. Missing Organization structured data schema
720. Missing BreadcrumbList structured data on all pages
721. Coach page has NO meta description
722. /coach in sitemap but disallowed in robots.txt — contradictory
723. Missing MedicalWebPage schema for health content
724. Missing HowTo schema on Guide page
725. Missing Article schema on PeptideDetail pages
726. Missing ItemList schema on Library page
727. Missing DefinedTermSet schema on Glossary
728. Missing AggregateRating schema on Reviews page
729. Missing WebApplication schema for Calculator/InteractionChecker
730. All sitemap lastmod dates identical — defeats purpose
731. Sitemap is static not auto-generated
732. Sitemap missing some peptide pages
733. PeptideDetail meta descriptions may exceed 160 chars — not truncated
734. Login and Signup share identical title
735. Inconsistent title separator — vs |
736. Landing title too long for SERPs (~75 chars Arabic)
737. Coach title not keyword-optimized
738. Pricing title too generic — no keywords
739. InteractionChecker title too vague — missing "ببتيدات"
740. Protected pages (Dashboard/Account/Tracker) missing noindex meta
741. No per-peptide OG social cards — generic og-image for all
742. Missing twitter:site handle
743. PeptideDetail OG title uses "Peptide Guide" instead of "pptides"
744. PeptideDetail Twitter card summary instead of summary_large_image
745. Missing og:locale on per-page Helmet sections
746. No breadcrumb navigation UI on any page
747. Missing cross-links between Calculator → Peptide pages
748. Missing cross-links between Guide → Calculator
749. Pricing H3 for sections where H2 more appropriate
750. Coach H1 may be styled div not actual h1 tag
751. No hero image/illustration on landing — text-heavy
752. OG image filename generic — should include Arabic keywords
753. No web app manifest file (manifest.json)
754. LCP may depend on Cairo font load time
755. CLS risk from TrialBanner appearing after auth state resolves
756. CLS risk from AgeGate modal after localStorage check
757. CLS risk from CookieConsent banner slide-up
758. Cairo font loads 4 weights — consider reducing to 3
759. No annual pricing option (comment says "coming soon")
760. No onboarding flow after payment — empty dashboard
761. Coach completely inaccessible without login — no free discovery
762. No reactivation flow for cancelled users
763. Signup redirects to pricing not trial activation
764. No Trustpilot/Google Reviews external widget
765. No media logos "as seen in" section
766. "الأكثر اختيارًا بين المحترفين" unverifiable claim
767. No plan comparison table on pricing
768. No countdown/urgency elements on CTAs
769. No social sharing buttons (WhatsApp/Telegram) on PeptideDetail
770. Share button sends recipients to locked page
771. Canonical URL flash on initial HTML load (static + Helmet)
772. No canonical handling for filtered Library URLs
773. hreflang tags only on static HTML not propagated via Helmet
774. Community/Reviews changefreq daily but may not actually update daily
775. No image sitemap extension
776. No sitemap index file
777. Glossary/Interactions low priority 0.6 but are high-SEO-value free pages
778. No GPTBot/CCBot specific rules in robots.txt
779. No Crawl-delay directive
780. Product schema priceValidUntil 2027-12-31 will go stale
781. Product schema missing review/aggregateRating
782. index.html exposes Supabase project ID via dns-prefetch
783. No Google Search Console verification meta tag
784. FAQPage schema on PeptideDetail uses raw data not natural language
785. Missing DefinedTerm schema for glossary terms
786. No PWA install prompt
787. GA4 only tracks initial page load not SPA navigations
788. Sentry errors lost before cookie consent acceptance
789. No Google Tag Manager implementation visible
790. Skip link present but may not function correctly
791. noscript fallback is good
792. No A/B testing infrastructure
793. No heatmap/session recording tool
794. No conversion tracking pixels
795. Landing has 6+ competing CTAs — dilutes focus
796. Exit intent popup not mobile-optimized (mouseleave only)
797. Free content strategy is smart but not explicitly communicated
798. Library free-to-paid progression good but trial peptide selection arbitrary
799. Email capture only on landing — should be on free tool pages too
800. No RSS feed for content updates
801. No blog/content marketing section
802. No affiliate/referral program
803. No social media content scheduling
804. No email drip campaign beyond welcome + trial reminder
805. No win-back email sequence
806. No NPS survey or user feedback mechanism
807. Contact is email-only — no live chat or chatbot
808. No video content or tutorials
809. No webinar/live demo offering
810. No case studies or detailed user stories
811. No comparison with alternatives page
812. No API documentation for potential integrations
813. Footer WhatsApp link opens empty picker — no phone number
814. No Instagram presence linked
815. No YouTube channel linked
816. Medical disclaimer could be more prominent
817. No HIPAA/health data compliance statement
818. No accessibility statement page
819. No cookie policy separate from privacy policy
820. Terms missing governing jurisdiction
821. Terms missing limitation of liability details
822. No DMCA/copyright policy for user content
823. pricing page FAQ could have more questions (only 5)
824. No student/researcher discount
825. No team/enterprise pricing
826. No free tier with limited access (only trial)
827. No partner/white-label option
828. Reviews page could show aggregate stats (avg rating, total reviews)
829. Community could highlight "top contributors"
830. No gamification beyond streak counter
831. No achievement badges or milestones
832. No progress tracking for protocol completion
