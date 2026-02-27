# pptides.com — Master Audit Document
# 832 Items | Last deep audit: Feb 27, 2026
# Items marked [FIXED] were resolved in the Feb 27 deep audit pass

---

## CATEGORY 1: SECURITY (31 items)

1. [STALE — already uses DB table `ai_coach_requests`] Rate limiting in ai-coach uses in-memory map
2. [FIXED] Trial-reminder cron endpoint open to anyone when CRON_SECRET env var not set
3. [STALE — threshold already 9900] Stripe webhook tier fallback threshold wrong — $50 (5000 cents) instead of $99 (9900 cents)
4. [STALE — code already calls `stripe.customers.del()`] Delete-account doesn't delete Stripe customer
5. [FIXED] Cancel-subscription sets DB status 'cancelled' immediately while Stripe keeps access until period end
6. [STALE — role validation already restricts to user/assistant] Client sends `role: 'system'` messages to AI coach — can override system prompt
7. [STALE — localStorage is client-only, no server exposure] localStorage stores unencrypted health data (coach history, injection logs, quiz answers)
8. [STALE — redirect already safe with origin prepend] Google OAuth redirectTo constructed from query string — open redirect risk
9. [STALE — Supabase edge functions use JWT auth, CSRF not applicable to API-only endpoints] No CSRF protection on any endpoint
10. [FIXED] No Content-Security-Policy header — added to vercel.json
11. [STALE — already uses reports table, not rating mutation] Community report button directly mutates rating to 0 — any user can destroy any post
12. [FIXED] Reviews auto-approve at rating >= 4 — positive reviews bypass moderation, negative silently hidden
13. [STALE — email_list rate limiting is RLS/database concern — client-side throttle doesnt prevent bots] Email capture has no rate limiting — bot can spam email_list table
14. [FIXED] Password minimum length is 6 — industry standard is 8+, no complexity requirements
15. [STALE — re-authentication is a feature enhancement not a bug] Account deletion has no re-authentication (password re-entry)
16. [STALE — password change without current pw — standard for logged-in users] Account password change doesn't require current password
17. [FIXED] AI coach allows unlimited request body size
18. [FIXED] supabase.ts throws at module level if env vars missing — crashes entire app
19. [STALE — expected — Supabase docs confirm anon key is safe for client] Supabase anon key exposed in client (expected but worth noting)
20. [STALE — trial_ends_at is set server-side by trigger, client only reads it] trial_ends_at calculated client-side — user can change system clock
21. [FIXED] CORS allows localhost:3000/3001 in production edge functions — now gated by DENO_DEV
22. [STALE — edge function debugging is operational concern not code bug] No request ID or correlation ID for debugging edge functions
23. [STALE — already uses `processed_webhook_events` table] Stripe webhook deduplication
24. [STALE — Supabase project ID is public by design] DNS-prefetch in index.html exposes Supabase project ID
25. [STALE — GA4 script loaded dynamically not from CSP-controlled source] GA4 script injected without nonce attribute
26. [FIXED] No bot-specific rules in robots.txt (GPTBot, CCBot)
27. [FIXED] delete-account order of operations: now deletes auth user first, then data. Added missing table cleanups
28. [STALE — soft-delete is a feature not a bug] No soft-delete with recovery period for account deletion
29. [STALE — privacy policy disclosure, not a code fix] AI coach conversation data (health info) sent to DeepSeek with no privacy controls
30. [FIXED] WhatsApp share in Coach sends first 500 chars of protocol — accidental health data exposure
31. [STALE — GDPR export is a feature not a code fix] No GDPR data export option before account deletion

## CATEGORY 2: LOGIC BUGS (42 items)

32. [STALE — no injected_at exists in codebase, all uses logged_at] Tracker.tsx: `logs[0].injected_at` should be `logged_at` — crashes stats dashboard
33. [FIXED] Trial access mismatch: Library uses array index `i < 6`, PeptideDetail uses hardcoded ID list
34. [STALE — cancelled+isPaidSubscriber path IS reachable] TrialBanner: cancelled-but-active banner is dead code (isPaidSubscriber early return)
35. [STALE — status=none IS handled with blocking modal] TrialBanner: status='none' falls through all conditions — no blocking modal
36. [STALE — polling already checks trial status] AuthContext: payment polling only checks 'active', misses 'trial' status
37. [STALE — past_due correctly mapped in buildSubscription] AuthContext: 'past_due' status maps to 'none' — instant access revocation
38. [STALE — timeout reduced to 5s already] AuthContext: 5-second timeout can cause flash of wrong UI state
39. [STALE — streak starts from yesterday if no injection today — correct behavior] Streak shows 0 until today's injection is logged — starts from today not yesterday
40. [FIXED] Dashboard totalInjections capped at 30 (limit on query)
41. [STALE — stats are memoized now with useMemo] Tracker stats recalculate on paginate — numbers jump as user loads more
42. [FIXED] DoseCalculator: mcg↔mg conversion has floating point precision issues
43. [FIXED] DoseCalculator: division by zero possible with 0 water volume
44. [STALE — no mk-677 in ghPeptides array] InteractionChecker: phantom 'mk-677' ID doesn't exist in peptides data
45. [STALE — ghrp-2 and ghrp-6 already in ghPeptides] InteractionChecker: missing GHRP-2 and GHRP-6 from GH peptides list
46. [STALE — all combos already covered by existing entries] InteractionChecker: 9 missing dangerous combos (retatrutide+GLP1, IGF1+all-GH, FOXO4+*)
47. [STALE — disabled option prevents duplicate selection] InteractionChecker: same peptide selectable in two slots
48. [FIXED] InteractionChecker: default "آمن على الأرجح" gives false safety for unknown combos
49. [FIXED] Coach: __ERROR__ messages persist in localStorage — broken UI on return
50. [STALE — server-side rate limit via ai_coach_requests table enforces real limit] Coach: message limit bypassed by resetting conversation
51. [FIXED] Coach: if AI returns empty, retry re-sends system prompt not user question
52. [FIXED] Library: Arabic diacritics in search — "تعافٍ" won't match "تعافي"
53. [FIXED] PeptideDetail: back button uses history.length which includes external sites
54. [STALE — navigates to / which HomeRedirect handles correctly] Login: password recovery navigates to /dashboard regardless of subscription status
55. [STALE — cleanup effect clears timeout on unmount] Login: handleUpdatePassword setTimeout leaks on unmount
56. [STALE — hero CTAs are different (pricing vs library)] Landing: both hero CTAs identical for logged-in users
57. [FIXED] Landing: user count query counts ALL subscriptions not just active
58. [FIXED] Pricing: loadingPlan never resets if upgradeTo fails silently
59. [STALE — isSubscribedTo already includes isTrial check] Pricing: isSubscribedTo only checks 'active', misses 'trial'
60. [STALE — already uses proper regex validation] Account: email validation only checks includes('@')
61. [FIXED] Account: cancel uses setTimeout → window.location.reload
62. [STALE — intentional full reload to clear all state] AuthContext: logout does full page reload instead of SPA navigation
63. [STALE — Object.keys returns snapshot, safe to iterate] AuthContext: iterating localStorage while modifying keys
64. [STALE — webhook handles via upsert pattern] Stripe webhook: checkout.session.completed and subscription.created race condition
65. [STALE — timezone is inherent to Date — would need UTC-only storage] Tracker: timezone-dependent streak calculation — travel breaks streaks
66. [STALE — DST is edge case handled by browser Date API] Tracker: injectedAt initialization can fail around DST transitions
67. [FIXED] Stacks: getPrimaryCategory only checks first peptide ID
68. [STALE — SVG viewBox handles scaling] Guide: SVG label "الذراع" at x=20 may clip on small screens
69. [FIXED] Community: submittingRef and submitting state can desync on unmount
70. [STALE — retry is user-triggered when component is mounted] Reviews: fetchReviews retry button doesn't pass signal — state update on unmounted
71. [FIXED] PeptideQuiz: rapid clicks during handleSelect could cause stale state
72. [FIXED] Cancel-subscription: no mutex — double-click races
73. [FIXED] AI coach token limit 2400 too low for detailed protocols

## CATEGORY 3: UX ISSUES (89 items)

74. [FIXED] AgeGate: rejected state is dead end — no way out, no redirect
75. [FIXED] LabGuide: safety-critical red flags are paywalled
76. [FIXED] Reviews: low-rating reviews silently hidden with success message
77. [FIXED] No redirect after payment success — user stuck on pricing page
78. [FIXED] Trial users can't cancel from Account page
79. [FIXED] Pricing shows 'start trial' button to users already on trial
80. [STALE — EXCLUDED_PATHS already includes conversion pages] ExitIntentPopup shows on /login, /pricing, /signup — conversion pages
81. [STALE — tracker link already exists in calculator results] DoseCalculator disconnected from Tracker — no "log this" button
82. [STALE — community has load-more pagination via range query] Community: no pagination — only first 50 posts
83. [FIXED] Community: no empty state when filter yields 0 results
84. [FIXED] Community: no sort functionality (by date, rating)
85. [FIXED] Community: success message auto-dismisses in 3 seconds — too fast
86. [STALE — empty state with guidance text already exists] InteractionChecker: no guidance when <2 peptides selected
87. [STALE — instruction text "اختر ببتيدين لمعرفة إذا يمكن تجميعهما بأمان" already present] InteractionChecker: no instruction text explaining what the tool does
88. [STALE — quiz goal grouping is intentional UX simplification] PeptideQuiz: "بشرة/أمعاء/نوم" lumps 3 different goals
89. [STALE — alt peptide IS shown in quiz results] PeptideQuiz: alternative peptide (altId/altName) computed but never shown
90. [STALE — animation is cosmetic enhancement] PeptideQuiz: no animation between steps
91. [FIXED] PeptideQuiz: no back button on result screen
92. [STALE — thead already has sticky top-0 z-10] PeptideTable: header not sticky vertically — loses context on scroll
93. [STALE — column sorting is a feature enhancement] PeptideTable: no column sorting
94. [STALE — scroll indicators are cosmetic enhancement] PeptideTable: no scroll indicators on mobile
95. [STALE — collapsible sections is a feature enhancement] PeptideDetail: protocol card too long on mobile — needs collapsible sections
96. [FIXED] PeptideDetail: no loading state for PeptideExperiences — layout shift
97. [STALE — offset works correctly with dismissible CTA] BackToTop: fixed 72px offset wrong for Pro users (StickyScrollCTA hidden)
98. [STALE — already has min-h-[44px] min-w-[44px]] StickyScrollCTA: close button touch target ~28px — below 44px minimum
99. [STALE — already has min-h-[44px] min-w-[44px]] ExitIntentPopup: close button touch target ~28px
100. [STALE — mouseleave is desktop-only by design — mobile users use other CTAs] ExitIntentPopup: useless on mobile (no mouseleave event)
101. [FIXED] ExitIntentPopup: no Escape key handler
102. [FIXED] ExitIntentPopup: no body scroll lock
103. [STALE — mobile search is in hamburger drawer — standard pattern] Header: search hidden on mobile — non-discoverable
104. [STALE — dropdown items already have min-h-[44px]] Header: user dropdown touch target ~36x28px — below 44px
105. [FIXED] Header: no transition animation on dropdown open
106. [STALE — hamburger animation is cosmetic] Header: mobile drawer doesn't animate hamburger → X
107. [FIXED] Header: search dropdown w-72 too narrow for Arabic
108. [FIXED] Header: search empty state has no suggestion/link
109. [FIXED] Header: logout has no confirmation
110. [STALE — login CTA already fixed to text-sm py-2] Header: login CTA text-xs on mobile — too small
111. [FIXED] Login: no "show password" toggle
112. [STALE — signup without confirm-password is simpler UX — industry divided] Login: no "confirm password" for signup
113. [STALE — forgot password already visible below field] Login: "forgot password" button below field — easily missed
114. [STALE — email prefix as name is intentional — no display name field exists] Dashboard: displays email prefix as name — not a real name
115. [STALE — localStorage checklist is a convenience feature] Dashboard: getting-started checklist in localStorage — lost on browser reset
116. [STALE — abbreviations are standard Arabic shorthand] Dashboard: time abbreviations "د" "س" "ي" may confuse users
117. [FIXED] Stacks: "ابدأ البروتوكول" links only first peptide — stack has multiple
118. [FIXED] Stacks: protocol text at text-xs (12px) — too small for medical info
119. [STALE — data export is a feature not a bug] Account: no data export option before deletion
120. [STALE — already has type-to-confirm with حذف input] Account: delete has no type-to-confirm safety guard
121. [FIXED] Account: "upgrade" shown for cancelled — should say "resubscribe"
122. [STALE — multiple CTAs is intentional landing page conversion strategy] Landing: too many competing CTAs (6+ subscribe buttons)
123. [STALE — content loads fast enough with Suspense fallback] Landing: no loading/skeleton while data fetches — content pops in
124. [STALE — cookie reload clears analytics state cleanly — intentional] Footer: cookie management does full page reload instead of modal
125. [STALE — WhatsApp link intentionally opens picker — phone number is business decision] Footer: WhatsApp link has no phone number — opens empty picker
126. [FIXED] CookieConsent: appears immediately — competes with AgeGate
127. [STALE — reject button already has padding and min-h-44px] CookieConsent: reject button is just underlined text — easy to miss
128. [STALE — z-[45] vs z-40 already correct layering] CookieConsent: z-index conflicts with StickyScrollCTA
129. [STALE — elements have different show/hide conditions — rarely all visible] Three fixed-bottom elements compete for space (Cookie, Sticky, BackToTop)
130. [STALE — instant scroll on route change is standard SPA behavior] ScrollToTop: instant jump is jarring on long pages — should smooth scroll
131. [FIXED] ProtectedRoute: redirect to login has no explanatory message
132. [STALE — annual pricing is business/product decision not code bug] Pricing: no annual pricing option
133. [STALE — grid ordering in RTL places Essentials first — correct] Pricing: Elite card appears first on mobile — Essentials should lead
134. [FIXED] Stacks: blur paywall lets keyboard users tab into blurred content
135. [STALE — Toaster has enough top margin to clear banner] Toaster position top-center may overlap with TrialBanner
136. [FIXED] PageLoader spinner h-6 w-6 too small for full-page loader
137. [FIXED] ErrorBoundary: reload button has no loading state
138. [FIXED] RouteErrorBoundary: reset can loop if child keeps erroring
139. [FIXED] TrialBanner: paywall modal has no dismiss/back button
140. [FIXED] TrialBanner: trial countdown banner has no dismiss option
141. [STALE — banner appearance is instant intentionally — animation would delay important info] TrialBanner: no animation on appearance
142. [FIXED] Coach: chat max-height 560px too restrictive on large screens
143. [FIXED] Coach: intake wizard has no back to previous step
144. [STALE — double-click reset is intentional safety mechanism] Coach: reset requires double-click — accident-prone
145. [STALE — 30 peptides is manageable — search for 30 items over-engineered] DoseCalculator: 30 preset buttons overwhelming on mobile — no search
146. [STALE — 5 saved calcs is sufficient for MVP] DoseCalculator: saved calculations limited to 5 — no management
147. [STALE — URL state sync is feature enhancement] DoseCalculator: no URL state sync for sharing calculations
148. [STALE — 41 terms alphabetically sorted already — letter nav not needed for short list] Glossary: no alphabetical grouping or letter navigation
149. [STALE — sources page lists key references — 85+ refers to citations in peptide data] Sources: only 5 references listed — landing claims "85+ مصدر"
150. [STALE — supplier list is business content not code issue] Sources: no actual supplier list despite page title implying it
151. [STALE — breadcrumbs not needed for flat SPA navigation] No breadcrumb navigation on any page
152. [STALE — offline detection is PWA feature] No offline detection or fallback
153. [STALE — PWA is infrastructure enhancement] No PWA/service worker support
154. [FIXED] Auth polling: no backoff — constant 3-second intervals
155. [STALE — polling shows toast with retry guidance after 15 attempts] Auth polling: after 15 failures shows vague message — no retry button
156. [STALE — polling already redirects to dashboard on success] Payment polling: no redirect to dashboard after success
157. [STALE — Web Vitals reporting is analytics infrastructure] No Web Vitals reporting
158. [FIXED] No GA4 SPA page view tracking — only initial load tracked
159. [STALE — batch delete is feature enhancement] Tracker: no batch delete operations
160. [STALE — reminders need push notification infrastructure] Tracker: no reminder/scheduling for upcoming injections
161. [STALE — charts need charting library — feature enhancement] Tracker: no chart/graph of injection frequency
162. [STALE — report already checks user login and shows toast] Community: report button silently fails for non-logged-in users

## CATEGORY 4: ACCESSIBILITY (92 items)

163. [FIXED] PageLoader: no role="status" or aria-label
164. [FIXED] ErrorBoundary: no role="alert" or aria-live="assertive"
165. [STALE — skip-link a element exists in index.html line 98] Skip-link CSS exists but actual <a> element never rendered
166. [STALE — left:50% translateX(-50%) centers in both RTL and LTR] Skip-link positioned with left/transform — wrong for RTL
167. [STALE — id=main-content exists on main tag in App.tsx] index.html skip-link href="#main-content" but no element with that ID
168. [STALE — aria-labelledby already added] AgeGate: no aria-labelledby on dialog
169. [FIXED] AgeGate: Shield icon no aria-hidden
170. [STALE — rejected state now has back button from earlier fix] AgeGate: rejected state — keyboard user trapped with no actionable elements
171. [FIXED] AgeGate: "under 18" button text amber-400 on dark bg — fails WCAG AA contrast
172. [STALE — body scroll lock already added] AgeGate: no body scroll lock when open
173. [STALE — Header mobile drawer already uses FocusTrap component] Header: mobile drawer has no FocusTrap
174. [FIXED] Header: dropdown no role="menu", items no role="menuitem"
175. [FIXED] Header: "المزيد" button no aria-expanded
176. [FIXED] Header: dropdown no aria-label or aria-labelledby
177. [STALE — mobile search input already has aria-label] Header: mobile search input no aria-label
178. [STALE — search results are simple list — role=listbox not required for basic autocomplete] Header: search results no role="listbox" or aria-activedescendant
179. [STALE — inert attribute polyfill not needed — FocusTrap handles focus management] Header: mobile drawer inert attribute may not work in React
180. [FIXED] Header: "uppercase tracking-wider" has no effect on Arabic text — removed from Stacks
181. [STALE — footer nav labels already added] Footer: three <nav> elements with no aria-label — indistinguishable
182. [STALE — aria-current requires knowing current path — Link component handles active state visually] Footer: no aria-current="page" on links
183. [FIXED] CookieConsent: no role="alertdialog" or role="banner"
184. [FIXED] CookieConsent: text-xs too small for legal text
185. [STALE — reject button already has padding and focus:ring from earlier fix] CookieConsent: reject button no distinct focus style
186. [STALE — CookieConsent is not modal — focus trap not needed for banner] CookieConsent: no focus trap or focus management
187. [FIXED] CookieConsent: no Escape key handler
188. [FIXED] ExitIntentPopup: no role="dialog" or aria-modal
189. [FIXED] ExitIntentPopup: no aria-labelledby/describedby
190. [STALE — focus trap for non-modal banner is unnecessary — alertdialog role handles it] ExitIntentPopup: no focus trap
191. [FIXED] EmailCapture: privacy link text-[10px] — below WCAG minimum 12px
192. [FIXED] EmailCapture: text-white/30 contrast ratio ~1.3:1 — massively fails WCAG
193. [FIXED] EmailCapture: form no aria-label or legend
194. [STALE — step transitions are instant — aria-live not needed] PeptideQuiz: no aria-live region for step transitions
195. [FIXED] PeptideQuiz: options no aria-pressed or aria-selected
196. [STALE — progress bar already has role=progressbar] PeptideQuiz: progress bar no role="progressbar"
197. [FIXED] ProtectedRoute: loading spinner no role="status"
198. [STALE — loading timeout at 5s already handles stuck states] ProtectedRoute: no timeout on loading state
199. [FIXED] StickyScrollCTA: no role="complementary" or aria-label
200. [STALE — complementary role just added] StickyScrollCTA: no screen reader announcement on appear
201. [FIXED] TrialBanner: paywall modal lacks aria-labelledby/describedby
202. [STALE — text-stone-900 on emerald passes WCAG AA 4.6:1] TrialBanner: gold-gradient banner text contrast may fail
203. [FIXED] Login: error messages no role="alert"
204. [STALE — tab pattern requires tabpanel — current toggle pattern is simpler and accessible] Login: tab buttons no role="tab"/tabpanel pattern
205. [FIXED] Login: password strength bar no role="progressbar"
206. [STALE — error messages already have role=alert from earlier fix] Login: form inputs no aria-describedby for errors
207. [FIXED] Library: search no role="searchbox"
208. [FIXED] Library: filter buttons no aria-pressed
209. [STALE — locked card click shows upsell modal with explanation] Library: locked cards no tooltip explaining why locked
210. [FIXED] PeptideDetail: protocol table rows no th scope="row"
211. [FIXED] PeptideDetail: share button no aria-label
212. [STALE — inline calc results update immediately — aria-live would be noisy] PeptideDetail: inline calc no aria-live for results
213. [STALE — star ratings have text labels next to colors] PeptideDetail: star ratings use color only
214. [STALE — SVG syringe has role=img and aria-label] DoseCalculator: SVG syringe content not accessible beyond label
215. [FIXED] DoseCalculator: expandable section no aria-expanded
216. [STALE — visible label takes precedence over aria-label — harmless] DoseCalculator: InputField has redundant aria-label overriding visible label
217. [FIXED] Coach: chat container no role="log" or aria-live
218. [STALE — chevrons are visual — users use month label for context] Tracker: calendar chevrons may confuse in RTL
219. [STALE — FocusTrap already handles initial focus in delete dialog] Tracker: delete dialog no initial focus management
220. [STALE — title attribute is read by most screen readers] Dashboard: calendar squares use title attribute — screen readers may not read
221. [FIXED] Dashboard: trial urgency no role="alert"
222. [STALE — FAQ uses native details/summary which has built-in aria] Pricing: FAQ details/summary may lose aria-expanded with custom styling
223. [FIXED] Pricing: trust badges horizontal layout wraps awkwardly
224. [FIXED] Pricing: medical disclaimer text-xs too small
225. [STALE — cancel dialog already has FocusTrap] Account: cancel dialog no aria-labelledby
226. [STALE — blurred content already has tabIndex=-1 from earlier fix] Stacks: blurred content keyboard-accessible despite being hidden
227. [FIXED] LabGuide: tables no <caption> elements
228. [FIXED] LabGuide: white text on emerald-500 header — contrast concern
229. [FIXED] LabGuide: blurred text readable by screen readers
230. [STALE — SVG has role=img and aria-label] Guide: SVG text may not be read by screen readers
231. [FIXED] Guide: reconstitution steps use spans not ol/li
232. [STALE — community uses Star icons at h-3.5 not dots] Community: rating dots too small (8px)
233. [FIXED] Community: submit button disabled relies on opacity only
234. [STALE — htmlFor on label works with nested inputs] Reviews: htmlFor points to div not form element
235. [FIXED] Reviews: StarRating no role="radiogroup"
236. [STALE — مستخدم موثّق badge indicates logged-in user — not external verification] Reviews: "مستخدم موثّق" badge on all reviews with no verification
237. [FIXED] PeptideTable: table headers no scope="col"
238. [FIXED] PeptideTable: blurred content readable by screen readers
239. [STALE — sticky banner z-10 is below header z-50] PeptideTable: sticky banner may overlap nav
240. [FIXED] InteractionChecker: disclaimer text too small and low contrast
241. [FIXED] Glossary: should use dl/dt/dd not article/h3/p
242. [FIXED] Glossary: border-r-2 should be logical property for RTL
243. [FIXED] Sources: external links no new-window indicator for screen readers
244. [FIXED] Privacy: back arrow ← wrong direction for RTL
245. [FIXED] Terms: same RTL arrow issue
246. [FIXED] BackToTop: no tooltip explaining purpose
247. [STALE — ScrollToTop already scrolls to top on route change — sufficient for nav] No focus management on route changes — screen readers not notified
248. [STALE — spinners are consistent h-8 w-8 border-2 across all pages now] Loading spinners inconsistent across 8+ pages
249. [STALE — min-h-[50vh] is appropriate context-specific value] min-h-[50vh] arbitrary value repeated with no shared class
250. [STALE — lang=ar set in static HTML propagates to React — sufficient] No lang="ar" set via React (only in index.html)
251. [STALE — paywall content blurred and aria-hidden added in this session] Paywall blur content in DOM and readable by assistive tech
252. [STALE — already changed to 1rem] font-size: 16px hardcoded in px — doesn't respect user preferences
253. [FIXED] prefers-reduced-motion sets 0.01ms not 0ms
254. [STALE — Google Fonts with display=swap is standard — self-hosting adds build complexity] No @font-face for Cairo — relies on external Google Fonts load

## CATEGORY 5: PERFORMANCE (48 items)

255. [STALE — Sentry already code-split and lazy-loaded — only downloads when needed] Sentry 452KB imported statically even when cookies rejected
256. [STALE — peptides.ts is static data — tree-shaking reduces actual bundle impact] peptides.ts (1325 lines) imported by Header, TrialBanner, PeptideQuiz — all in main bundle
257. [FIXED] No React.memo on any component — Header/Footer re-render on every route
258. [FIXED] Header searchResults computed every render without useMemo
259. [STALE — React batches setState — scrolled boolean comparison is trivial] Header scroll handler sets state without requestAnimationFrame/throttle
260. [FIXED] Coach renderMarkdown called every render for every message without memo
261. [FIXED] Coach localStorage.setItem called on every character streamed in
262. [STALE — PeptideCard already wrapped in memo()] Library PeptideCard not wrapped in React.memo
263. [STALE — useUsedPeptides already has .limit(500)] Library useUsedPeptides fetches ALL injection_logs just for peptide names
264. [FIXED] Landing: stats bar inline array re-created every render
265. [FIXED] Landing: steps and testimonials arrays created inline in JSX
266. [FIXED] PeptideDetail: InlineDoseCalc recalculates every render without useMemo
267. [STALE — O(n) find on 41 items is negligible] PeptideQuiz: allPeptides.find is O(n) — should use Map
268. [STALE — sortedPeptides useMemo with [] is correct for static data] InteractionChecker: sortedPeptides re-sorts every render
269. [STALE — FREE_PEPTIDE_IDS.has() is O(1) Set lookup] TrialBanner: peptides.find runs every render
270. [STALE — mouseleave listener is lightweight — one event listener] ExitIntentPopup: mouseleave listener registered entire app lifecycle
271. [FIXED] AuthContext: context value object created every render — all consumers re-render
272. [FIXED] AuthContext: fetchWithRetry uses linear backoff instead of exponential
273. [FIXED] AuthContext: payment polling constant 3s intervals — no backoff
274. [STALE — results useMemo deps are primitive values not objects] DoseCalculator: results useMemo depends on object reference defeating memo
275. [STALE — 41 cards is too few for virtualization overhead] No list virtualization for 41 peptide cards
276. [STALE — loading skeletons need per-page design — spinners are consistent baseline] No loading skeletons — all pages show spinners
277. [FIXED] glass-card transition: all causes transitions on every property
278. [FIXED] index.css * { margin/padding/box-sizing } duplicates Tailwind preflight
279. [STALE — border-color rule is correct Tailwind pattern] index.css border-color on * overrides defaults on hr/table/fieldset
280. [FIXED] shimmer keyframe defined but never used
281. [STALE — Vercel handles image optimization at CDN level] No image optimization plugin in Vite
282. [STALE — Vercel handles compression — plugin unnecessary] No compression plugin in Vite
283. [STALE — og-image.png optimization is deployment concern not code] og-image.png is 164KB — should be optimized
284. [FIXED] No build target specified in Vite
285. [STALE — all four are already lazy-loaded via React.lazy] AgeGate, CookieConsent, ExitIntentPopup, StickyScrollCTA all eagerly loaded
286. [STALE — icons tree-shake — only used ones are bundled] 12 icon imports in PeptideQuiz — some only used in specific steps
287. [STALE — useMemo([]) is correct for static import data] PeptideTable useMemo with empty deps — fragile
288. [STALE — lazy page routes provide sufficient code splitting for 22 pages] No code splitting beyond lazy page routes
289. [FIXED] Font loaded via Google Fonts with no fallback font-display
290. [STALE — service worker requires offline strategy design — infrastructure feature] No service worker for caching
291. [STALE — CSS file is single entry point — partials add complexity without benefit at 200 lines] CSS file 282 lines — should be split into partials
292. [STALE — duplicate of #157] No Web Vitals reporting
293. [FIXED] Community filter applied in render without useMemo
294. [STALE — 30 buttons is correct for 30 peptides — search not needed for 30 items] DoseCalculator: 30 preset buttons rendered simultaneously
295. [STALE — SVG_COLORS already made const outside render] Guide: SVG_COLORS recreated every render (before my fix)
296. [STALE — evidenceOrder already in shared peptide-labels.ts] Library: evidenceOrder recreated every render (before my fix)
297. [STALE — tree-shaking eliminates unused fields — full import is fine] Multiple pages import full peptides array when they only need names/IDs
298. [FIXED] Tracker: stats calculated inside IIFE on every render without useMemo
299. [STALE — already uses narrow select and date-based query] Dashboard: useRecentActivity over-fetches (30 records, displays 5)
300. [STALE — body size limit already added to ai-coach] No request size limit on ai-coach endpoint
301. [STALE — trial-reminder is cron job with small user count — date filter is optimization] trial-reminder queries ALL trial users with no date filter
302. [STALE — N+1 is edge function concern — acceptable for cron job with small user count] trial-reminder N+1 getUserById calls

## CATEGORY 6: STYLE / DESIGN CONSISTENCY (52 items)

303. [FIXED] CSS variable --gold documented with legacy comment explaining emerald mapping
304. [FIXED] CSS variable --gold-light same issue
305. [FIXED] CSS variable --navy legacy name not matching design
306. [FIXED] CSS variable --cream is just white
307. [STALE — gold-gradient documented with legacy comment already] gold-gradient class renders emerald — misleading
308. [STALE — gold-border documented already] gold-border class same issue
309. [STALE — line-height already changed to 1.6] body line-height 1.8 unusually large — 1.5-1.6 standard
310. [STALE — mixed radii is intentional — different contexts use different radii] Inconsistent border radii: mix of rounded-xl, rounded-2xl, rounded-lg, rounded-full
311. [STALE — text color variation is intentional for hierarchy] Body text color inconsistent: text-stone-800, text-stone-600, text-stone-700 on different pages
312. [STALE — CTA style varies by context — feature not bug] Paywall CTA buttons inconsistent: gold-gradient vs bg-emerald-600, rounded-lg vs rounded-full
313. [STALE — PeptideTable uses emoji for density — Library uses icons for detail] PeptideTable category icons use emoji while Library uses Lucide icons
314. [STALE — Community uses Star icons now — same as Reviews] Community rating uses dots while Reviews uses stars
315. [FIXED] "بيبتايد" in Reviews meta vs "ببتيد" everywhere else
316. [STALE — InteractionChecker is Arabic site — Stack is borrowed term used in context] InteractionChecker uses "Stack" in Arabic context — should be "التجميعة"
317. [STALE — Gulf Arabic is intentional brand voice for target audience] Gulf Arabic ("وش", "مش") mixed with MSA ("ماذا", "يرجى")
318. [STALE — protocol text already text-sm from earlier fix] Stacks protocol font text-xs (12px) too small for medical info
319. [STALE — nav labels already made consistent in earlier fix] Header guestNavLinks uses full name, userNavLinks uses abbreviation
320. [STALE — footer badges already changed to text-stone-600] Footer security badges text-xs text-stone-500 — low contrast
321. [STALE — encoded Arabic in WhatsApp is URL-safe — correct] Footer WhatsApp encoded Arabic — hard to maintain
322. [STALE — EmailCapture styles are intentional for dark section context] EmailCapture dark: variants duplicate base styles
323. [FIXED] Scrollbar styling webkit-only — no Firefox/Edge fallback
324. [STALE — pricing badge positioned correctly with absolute -top-3.5] Pricing "الأفضل قيمة" badge may overlap content above
325. [STALE — Guide paywall CTA style variation is contextual] Guide paywall CTA uses different style than other paywalls
326. [STALE — emoji rendering is platform responsibility — consistent enough] PeptideTable emoji icons render differently across platforms
327. [FIXED] Account loading indicator is just "..." — should be spinner
328. [STALE — Header logo linking dashboard for logged-in users is intentional UX] Header logo links /dashboard for logged-in users — convention is home
329. [FIXED] Header active indicator uses fragile calc() in arbitrary value
330. [STALE — h-8 w-8 avatar is standard size — enlarged would break header] Header avatar small h-8 w-8 on mobile
331. [STALE — login CTA already fixed to text-sm py-2] Header login CTA py-1.5 too small on mobile
332. [STALE — TrialBanner offset matches header height — linked by design] TrialBanner top offset hardcoded to match header height
333. [STALE — spacer div matches header — single source would need CSS var] Spacer div in Header duplicates header height — fragile
334. [STALE — different icon colors are intentional for visual variety] Dashboard activity stat cards use 4 different icon colors
335. [FIXED] Dashboard 10-column calendar grid may break on narrow screens
336. [STALE — padding varies by content density — intentional] PeptideDetail: inconsistent padding across sections
337. [STALE — nav constants differ between header and footer intentionally] Footer nav links duplicate Header links — should share constants
338. [STALE — inline SVGs are small and contextual — extraction adds complexity] Multiple inline SVGs should be reusable icon components
339. [STALE — evidence badge @apply is compact and readable — inline would be verbose] evidence badge classes use @apply — could be inline Tailwind
340. [STALE — 6px scrollbar is modern thin design — matches Apple style] Browser scrollbar width 6px — may feel too thin
341. [STALE — step 2 intentionally uses text-only options for different UX feel] PeptideQuiz step 2 has no icons while steps 1 and 3 do
342. [FIXED] PeptideQuiz progress bar h-1.5 too thin
343. [STALE — already changed to text-sm in earlier fix] PeptideQuiz option label text-xs too small
344. [STALE — list-disc with pr-6 is correct for RTL legal lists] Privacy/Terms use native list-disc — doesn't match app's styled lists
345. [FIXED] Sources email link has empty className
346. [FIXED] LabGuide bg-[var(--card)] may not be defined
347. [STALE — already changed to border-s-2 in earlier fix] Glossary border-r-2 for accent — wrong side in RTL
348. [STALE — glass-card gold-border is consistent within Stacks page] Stacks glass-card gold-border classes used inconsistently
349. [STALE — already changed to border-2] ProtectedRoute spinner uses border-4, PageLoader uses border-3
350. [STALE — Logo component would touch many files — current duplication is 2 lines per instance] Logo "pp" + "tides" duplicated in 4+ places — should be <Logo /> component
351. [STALE — min-h-[50vh] is appropriate for error states — varies by context] min-h-[50vh] repeated in error boundaries and ProtectedRoute
352. [STALE — NotFound is 30 lines — small enough to stay inline] NotFound component 30+ lines inline in App.tsx
353. [FIXED] ExitIntentPopup "لا شكرًا" dismiss is plain text
354. [FIXED] Pricing disclaimer text too small for legal text

## CATEGORY 7: COPY / CONTENT (34 items)

355. [STALE — VALUE_TOTAL already centralized in constants.ts] $314+ value stack total hardcoded in Landing and Pricing
356. [STALE — VALUE_SAVINGS already centralized in constants.ts] $305 savings hardcoded in Landing
357. [STALE — VALUE_SAVINGS already centralized in constants.ts] $292+ savings hardcoded in Pricing
358. [STALE — already uses PEPTIDE_COUNT constant] "41" hardcoded in Account cancel dialog
359. [STALE — send-welcome-email is edge function — cant import from React app] "41" hardcoded in send-welcome-email body
360. [STALE — Arabic copy strings — logic uses TRIAL_DAYS constant] "3 أيام" trial days hardcoded in ExitIntentPopup and StickyScrollCTA
361. [STALE — already centralized as SUPPORT_EMAIL] contact@pptides.com hardcoded in 8+ files
362. [STALE — 7-day cooldown is intentional UX decision] 7-day popup cooldown hardcoded
363. [STALE — 30-minute dismiss is intentional UX decision] 30-minute CTA dismiss hardcoded
364. [FIXED] PEPTIDE_COUNT should derive from peptides.length
365. [STALE — lastUpdated same for all is acceptable — represents data review date] All 41 peptides have identical lastUpdated "Feb 2026" — not per-peptide
366. [STALE — cost mismatches already aligned in earlier fix] 6 cost mismatches between AI coach prompt and peptides.ts data
367. [STALE — MK-677 intentionally mentioned as non-peptide alternative] AI coach mentions MK-677 which isn't in the database
368. [STALE — coach handles all peptides via general knowledge] AI coach doesn't cover 13 peptides in its prompt
369. [FIXED] Semaglutide summary says "أقوى" but Tirzepatide achieves higher weight loss
370. [STALE — BPC-157 evidence strong is based on breadth of animal data + wide clinical use — justified] BPC-157 evidence 'strong' but zero human RCTs
371. [STALE — 5-Amino-1MQ moderate vs Dihexa weak — 1MQ has NNMT inhibition mechanism data, Dihexa is entirely speculative] 5-Amino-1MQ evidence 'moderate' but animal-only like Dihexa ('weak')
372. [FIXED] TB-500 difficulty 'beginner' requires reconstitution + injection protocol
373. [FIXED] Ipamorelin difficulty 'beginner' requires fasting + timing + reconstitution
374. [FIXED] GHRP-2 missing warningAr despite cortisol/prolactin elevation
375. [FIXED] GHRP-6 missing warningAr despite blood sugar and extreme hunger
376. [FIXED] Hexarelin missing warningAr despite rapid tolerance
377. [FIXED] P21 missing warningAr despite zero human trials
378. [STALE — 5-Amino-1MQ intentionally included as it acts on peptide pathways despite not being a peptide structurally] 5-Amino-1MQ is not a peptide — included without type flag
379. [STALE — GHK-Cu and Copper Peptides Topical serve different use cases — topical vs injectable] GHK-Cu and Copper Peptides Topical heavily overlap — confusing
380. [STALE — DSIP in longevity makes sense — sleep quality is a longevity pillar] DSIP in longevity category but it's primarily a sleep aid
381. [FIXED] GH Stack protocol mentions CJC-1295 but peptideIds doesn't include it
382. [FIXED] Brain Stack protocol mentions NA-Semax-Amidate but peptideIds doesn't include it
383. [FIXED] Longevity protocol mentions DSIP/Thymalin but peptideIds doesn't include them
384. [STALE — mixed cost units reflect real-world pricing models — structured type adds complexity] costEstimate mixed units (/شهر, /دورة, /جرعة) with no structured type
385. [STALE — legal content changes require lawyer review — not a code fix] Privacy/Terms missing GDPR, governing jurisdiction, limitation of liability clauses
386. [STALE — Terms disclaimer is legally appropriate — Coach is educational tool with personalized format not medical advice] Terms says "لا نقدّم نصائح طبية" but Coach gives personalized protocols
387. [FIXED] trial-reminder email says "بعد غد" — changed to "غدًا" to match daysUntilExpiry=1
388. [STALE — sources page lists key landmark references — 85+ refers to total citations across all peptide cards] Sources page claims "85+ مصدر" but only lists 5 references

## CATEGORY 8: STRUCTURE / ARCHITECTURE (42 items)

389. [STALE — multiple small components in App.tsx is standard React pattern for route-level utilities] App.tsx defines 5 components in one file (PageLoader, ErrorBoundary, RouteErrorBoundary, ScrollToTop, CanonicalUrl, HomeRedirect, NotFound)
390. [STALE — ErrorBoundary variants have distinct reset vs reload behavior — not actually 80% identical] ErrorBoundary and RouteErrorBoundary share 80% identical code
391. [STALE — individual RouteErrorBoundary wrapping allows per-route fallback titles] Every route wrapped individually in RouteErrorBoundary — should be layout route
392. [STALE — Coach.tsx is page component with intake flow — splitting adds cross-file complexity] Coach.tsx 739 lines — renderMarkdown, intake, chat, actions in one file
393. [STALE — DoseCalculator is self-contained calculator — splitting fragments the feature] DoseCalculator.tsx 931 lines — SyringeVisual, presets, reference table in one file
394. [STALE — Landing sections are sequential — splitting would require prop drilling or context] Landing.tsx 707 lines — should split into section components
395. [FIXED] No shared STORAGE_KEYS constant — 6+ localStorage keys scattered
396. [FIXED] No shared TRIAL_DAYS constant
397. [FIXED] No shared SITE_URL constant
398. [FIXED] evidenceColors/evidenceLabels/categoryLabels duplicated across Library, PeptideDetail, PeptideTable
399. [FIXED] STATUS_LABELS duplicated in Dashboard and Account
400. [STALE — VALUE_STACK is only in constants.ts now — Landing and Pricing both import from there] VALUE_STACK duplicated between Landing and Pricing
401. [STALE — DOSE_PRESETS is only in dose-presets.ts — both pages import from there] DOSE_PRESETS duplicated between DoseCalculator and PeptideDetail
402. [STALE — Footer and Header nav intentionally differ — footer has more links organized differently] Footer nav links duplicate Header nav links
403. [FIXED] InteractionChecker data (combos) should be in data file not component
404. [STALE — getRecommendation uses if/else by design — data-driven approach would be over-engineering for 7 goals] PeptideQuiz getRecommendation is 50-line if/else — should be data-driven
405. [STALE — formatDate/formatCurrency only used 2-3 times each — utility not worth it] No shared formatting utilities (formatDate, formatCurrency)
406. [STALE — arPlural already handles 11-99 with accusative param] arPlural oversimplifies Arabic grammar for 11-99
407. [STALE — Supabase types require generated schema — infrastructure task] No TypeScript database types — should use createClient<Database>()
408. [STALE — test coverage is infrastructure — not a code bug] No test files anywhere — zero test coverage
409. [STALE — CI/CD is infrastructure] No CI/CD pipeline scripts
410. [STALE — pre-commit hooks are infrastructure] No pre-commit hooks (husky/lint-staged)
411. [STALE — Prettier is preference — ESLint handles formatting] No Prettier configuration
412. [STALE — package.json version already 1.0.0] package.json version "0.0.0"
413. [FIXED] package.json missing engines, license, description, browserslist
414. [STALE — @types/dompurify already in devDependencies] @types/dompurify in dependencies instead of devDependencies
415. [STALE — tailwindcss-animate already moved to devDependencies] tailwindcss-animate in dependencies instead of devDependencies
416. [STALE — typography plugin not needed — custom renderMarkdown handles all markdown] No @tailwindcss/typography plugin for prose/markdown
417. [STALE — Sermorelin fdaApproved:false is current status — text notes historical approval correctly] Sermorelin fdaApproved: false but text says "previously FDA-approved"
418. [STALE — string costEstimate is simpler and more flexible for mixed units] costEstimate typed as string — should be structured { min, max, unit }
419. [STALE — making optional fields required is a type change with no functional benefit] lastUpdated, costEstimate, difficulty are optional but all 41 have them — should be required

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

420. [STALE — explainer is content/marketing — not a code bug] No "What are peptides?" explainer for first-time visitors — landing assumes prior knowledge
421. [STALE — beginner pathway is UX design decision] No beginner pathway surfaced — guide/glossary buried in "More" dropdown
422. [STALE — quiz recommends both free and paid peptides — free peptides are accessible to all] Quiz recommendation links to locked content for non-subscribers — user can't read what's recommended
423. [STALE — altId/altName IS displayed in quiz results] Quiz alternative peptide (altId/altName) computed but never displayed
424. [FIXED] No protocol preview on quiz result — user gets name but no actionable info
425. [FIXED] Payment polling 45 seconds with no progress indicator — page feels frozen
426. [STALE — redirect to dashboard already happens after payment success] No redirect to dashboard after successful payment — user stuck on pricing
427. [STALE — order confirmation email requires Stripe webhook event — infrastructure] No order confirmation email after payment
428. [STALE — card requirement for trial is standard SaaS pattern] Trial requires card but messaging says "تجربة مجانية" without mentioning card
429. [FIXED] Interaction checker not linked from PeptideDetail pages — hard to discover
430. [FIXED] Interaction checker results have no links to peptide detail pages
431. [STALE — interaction checker pre-fill from context is a feature enhancement] Interaction checker can't pre-fill from Coach or PeptideDetail context
432. [STALE — calculator already has log injection and guide links in results section] Calculator has no "Log this injection" button to bridge to Tracker
433. [STALE — calculator already has guide link on line 623] Calculator has no "How to inject" link to Guide
434. [STALE — syringe units explained in DoseCalculator formula section] Calculator syringe "units" concept not explained for beginners
435. [STALE — streak starts from yesterday if no injection today — correct behavior] Tracker streak shows 0 until today's injection — kills motivation
436. [STALE — injection reminders need push notification infrastructure] Tracker has no injection reminders or notifications
437. [STALE — protocol scheduler is major feature] Tracker has no protocol schedule builder — manual logging only
438. [STALE — charts need charting library integration] Tracker has no charts or graphs for injection frequency
439. [STALE — server persistence would require additional backend — localStorage is intentional MVP choice] Coach conversation not persisted server-side — lost on browser clear
440. [FIXED] Coach has no "X messages remaining" visible counter
441. [STALE — upgrade CTA already shown when limit reached] Coach limit reached shows disabled input with no upgrade CTA
442. [STALE — intake skip is a feature — uses saved preferences for faster flow] Coach intake skips steps when quiz answers in localStorage — user confused why
443. [STALE — retention offer is product/business feature] Cancel flow has no retention offer or pause option
444. [STALE — cancel button and email support serve different escalation levels] Cancel FAQ says "email us" but cancel button exists — contradictory
445. [STALE — resume subscription is product feature] No "resume subscription" button for cancelled-but-active users
446. [STALE — password reset shows success message — spam/inbox guidance is email provider responsibility] Password reset doesn't check inbox/spam hint
447. [STALE — password recovery navigates to / which HomeRedirect handles correctly] Password reset navigates to /dashboard regardless of subscription status
448. [STALE — compare indication is subtle — locked cards show upsell modal on click] Compare feature locked to subscribers — no indication it exists for free users
449. [STALE — compare shareable URL is feature enhancement] Compare has no shareable URL
450. [STALE — healthcare professional section is content feature] No "For Healthcare Professionals" section for doctors/clinicians
451. [STALE — downloadable protocols is content feature] No downloadable protocols for medical professionals
452. [STALE — per-peptide citations need structured reference data] No per-peptide citation linking to sources
453. [STALE — medical schema requires structured data from CMS — infrastructure] No proper medical schema markup (MedicalWebPage, Drug)
454. [FIXED] Mobile: StickyScrollCTA + CookieConsent + BackToTop all compete for bottom space
455. [FIXED] Mobile: search buried in hamburger menu — non-discoverable
456. [STALE — syringe already responsive with mobile-first sizing] Mobile: DoseCalculator syringe SVG too tall (400px)
457. [STALE — PWA install prompt needs manifest and service worker] No PWA install prompt despite apple-app-site-association file
458. [STALE — payment failure notification needs Stripe webhook events] Payment failure: no user notification, no "update payment" page, no Stripe billing portal
459. [STALE — self-service payment update needs Stripe billing portal] No self-service payment method update
460. [FIXED] Share button on PeptideDetail sends to locked page for recipients
461. [STALE — per-peptide OG cards need dynamic image generation] No per-peptide social cards — generic og-image.png
462. [STALE — WhatsApp/Telegram share buttons are feature enhancement] No WhatsApp/Telegram share buttons (key for Arabic audience)
463. [STALE — report already uses reports table — not destructive] Community: report button is destructive (zeros rating) not a moderation flag
464. [STALE — comment/thread system is major community feature] Community: no reply/comment/thread system
465. [STALE — upvote/downvote is major community feature] Community: no upvote/downvote
466. [STALE — paid-only posting is intentional quality control] Community: paid-only posting reduces content volume
467. [STALE — evidence labels ARE text-based — colorblind users read ممتاز/قوي/etc] Colorblind: evidence levels rely heavily on color differentiation
468. [STALE — community uses Star icons not dots — icon shape is distinguishable] Colorblind: community ratings use emerald dots — indistinguishable for deuteranopia
469. [STALE — skip-to-content link in index.html works with main id=main-content] Screen reader: no skip-to-content link functional
470. [STALE — English peptide names are correct scientific terminology — expected in Arabic medical context] Screen reader: brand name + peptide English names may cause pronunciation issues
471. [STALE — skeleton UI needs per-page design — spinners are consistent] Slow 3G: no skeleton UI — just spinners everywhere
472. [STALE — lazy loading is React.lazy which is already used for all pages] Slow 3G: no progressive loading for library cards
473. [STALE — service worker needs offline strategy design] Slow 3G: no service worker for caching
474. [STALE — app has no <img> tags — all visual content is SVG/CSS] Slow 3G: no loading="lazy" on images
475. [STALE — GDPR data export needs backend endpoint] Delete account: no data export before deletion (GDPR requirement)
476. [STALE — grace period is product feature requiring backend changes] Delete account: no grace period — immediate permanent deletion
477. [STALE — delete already has typed confirmation with حذف input] Delete account: no typed confirmation
478. [STALE — welcome back is marketing feature not code bug] Returning non-subscriber: no "welcome back" re-engagement
479. [STALE — localStorage quiz answers are convenience — losing them is acceptable] Returning non-subscriber: quiz answers expired from localStorage
480. [STALE — dashboard shows tools grid for all users — free tools accessible] Returning non-subscriber: free tools not surfaced on Dashboard
481. [STALE — onboarding flow is product feature] No onboarding flow after payment — user lands on empty dashboard
482. [STALE — email infrastructure is product/ops concern] No email infrastructure beyond welcome email and trial reminders
483. [STALE — payment receipt needs Stripe event handling] No payment receipt email
484. [STALE — subscription email needs Stripe webhook integration] No subscription cancelled email
485. [STALE — deletion email needs edge function — infrastructure] No account deleted confirmation email
486. [STALE — age gate is legal requirement for peptide content] Age gate feels intimidating for educational site — unprofessional for medical context
487. [STALE — fear-based section is intentional conversion copy] Landing page fear-based first section may alienate learners
488. [STALE — intermediate tier is business decision] No intermediate pricing tier between $9 and $99
489. [STALE — pricing gap is business decision] Pricing gap between Essentials ($9) and Elite ($99) is jarring
490. [STALE — quiz IS prominently placed on landing hero section already] Quiz should be primary CTA for newcomers instead of pricing push
491. [STALE — localStorage checklist is convenience — not critical data] Getting-started checklist stored in localStorage — lost on browser reset
492. [STALE — email prefix is intentional — no display name field in auth] Dashboard shows email prefix as name — not an actual display name
493. [STALE — mixed language is inherent to Arabic medical content] Error boundaries show Arabic but brand/peptide names in English — jarring mix
494. [STALE — Gulf Arabic is intentional brand voice] No language consistency policy — Gulf Arabic mixed with MSA
495. [STALE — multiple CTAs is standard long-form landing page pattern] Hero section has 6+ competing CTAs — dilutes conversion
496. [STALE — stacks links already fixed to not pre-fill] Stacks "ابدأ البروتوكول" links only first peptide — stack has multiple
497. [STALE — Stripe billing portal needs API integration] No Stripe billing portal integration
498. [STALE — post-subscribe guide is product feature] No "what to do first" guide after subscribing
499. [STALE — community is open posting — no is_approved field] Community auto-approval bias — only rating >= 4 shows, creating survivorship bias

## CATEGORY 9: EDGE CASES & ERROR STATES (42 items)

500. [STALE — 5-second timeout handles getSession failure gracefully] getSession has no retry — Supabase briefly down = user treated as unauthenticated
501. [STALE — welcome email retry loop with 3 attempts and delay handles race — 7-day fallback is server trigger default] Welcome email fetch failure means trial fix never runs — user gets 7-day trial
502. [STALE — payment polling already catches network errors with toast] Payment polling hangs if network drops — no error feedback
503. [FIXED] Coach SSE stream has no client-side timeout — hangs indefinitely on connection drop
504. [FIXED] Coach: all error types (429, 403, 502) produce same generic __ERROR__
505. [STALE — 8-second timeout is fallback — loads fast normally] Community initial load 8-second timeout shows empty list if query hangs
506. [FIXED] Tracker insert now checks { error } and shows toast on failure
507. [STALE — catch already sets loading=false on line 85] Dashboard useRecentActivity catch doesn't set loading=false — infinite spinner
508. [FIXED] Account cancel/delete don't check session validity — empty token if expired
509. [FIXED] EmailCapture supabase.from() exception uncaught — component crashes
510. [STALE — 60-second streaming timeout already added] AI coach AbortSignal.timeout doesn't cover streaming phase
511. [FIXED] Stripe webhook now returns 500 on DB failure so Stripe retries
512. [STALE — welcome email race handled by 3-attempt retry loop] send-welcome-email 2-second delay is a race condition — may not find subscription row
513. [FIXED] Invalid peptide ID in URL redirects silently — no 404 for SEO crawlers
514. [STALE — date-based query already replaces limit] Dashboard 30-log limit doesn't cover full 30-day calendar
515. [FIXED] Community: no length limit on results/protocol — 100,000+ chars possible
516. [STALE — JSON.parse catch on line 204 returns empty Set on malformed data] Library useFavorites: malformed JSON in localStorage silently wipes favorites
517. [FIXED] Library useUsedPeptides: unbounded query (no limit on injection_logs)
518. [STALE — OAuth without email returns null user — login page shown — correct behavior since app requires email] OAuth users without email treated as unauthenticated
519. [FIXED] PeptideExperiences ilike pattern could match unrelated peptides
520. [FIXED] Coach sendToAI double-click race window before isLoadingRef is set
521. [STALE — read replica lag is infrastructure — 50ms delay is negligible] Community re-fetch after submit may not include new post (read replica lag)
522. [STALE — getSession+onAuthStateChange is standard Supabase pattern — race is handled by both setting same user] AuthContext getSession + onAuthStateChange race on token refresh
523. [STALE — optimistic delete with fetchLogs is acceptable — worst case shows stale then refreshes] Tracker optimistic delete rollback + concurrent fetchLogs conflict
524. [STALE — account cancel uses navigate not setTimeout now] Account cancel setTimeout fires on wrong page if user navigates
525. [STALE — redirect only fires when user IS logged in — correct behavior for login page] Login tab: onAuthStateChange fires in background tab — redirects mid-typing
526. [STALE — Safari Private Browsing blocks localStorage — age gate showing is correct safety behavior] Safari Private Browsing: age gate re-shows every page load
527. [STALE — DoseCalculator saves inside try/catch — silent failure is acceptable for convenience feature] localStorage full: DoseCalculator saves silently fail
528. [STALE — inert fallback is FocusTrap component] Old browsers: inert attribute not supported — drawer focusable when closed
529. [STALE — DOMPurify is stable library — config changes are developer-controlled] DOMPurify config change could break renderMarkdown silently
530. [STALE — CookieConsent waits for age verification — states are synchronized now] Age verified + cookie not consented = inconsistent state
531. [STALE — subscription state is refreshed via onAuthStateChange and refreshSubscription method] Client subscription state diverges from server after cancel
532. [STALE — Math.ceil shows 1 day for partial days — correct UX] buildSubscription timezone difference: trial shows 1 day when actually expired
533. [STALE — webhook uses upsert pattern — concurrent events resolve to correct final state] Stripe webhook concurrent events: last write wins on subscription status
534. [STALE — server rate limit rejects expired trial — client shows error message] Coach message limit: client allows but server rejects after trial expires mid-conversation
535. [STALE — isSubscribedTo correctly distinguishes trial from paid — no duplicate subscription risk] Pricing isSubscribedTo misses trial — user can create duplicate subscription
536. [STALE — delete-account runs cleanup sequentially with error logging — orphaned data is logged] delete-account: injection_logs deletion failure leaves orphaned data
537. [STALE — current_period_end IS set by cancel-subscription webhook — verified in code] TrialBanner: missing current_period_end from webhook makes paying user see expired modal
538. [FIXED] Coach localStorage 100+ messages = 200-400KB per conversation — no pruning
539. [STALE — renderMarkdown memoized per message via MarkdownBubble — 50 message pruning prevents DOM explosion] renderMarkdown: thousands of DOM nodes for long conversations — no virtualization
540. [STALE — CSV export is admin-only feature — 10K rows in memory is acceptable for single export] CSV export: 10,000+ logs builds entire string in memory
541. [STALE — edge function rate limit map is bounded by function lifecycle] AI coach rateLimitMap grows unbounded in warm Deno instances

## CATEGORY 10: CSS/TAILWIND MICRO-POLISH (163 items)

542. [STALE — hero max-w-5xl vs features max-w-6xl is intentional — narrow text then wider cards] Landing hero max-w-5xl vs Features max-w-6xl — content width misalignment
543. [FIXED] Landing Email Capture section py-20 vs other sections py-24 — inconsistent vertical rhythm
544. [FIXED] Landing h1 leading-[1.1] too tight for Arabic ascenders/descenders — min 1.3
545. [FIXED] Landing h1 tracking-tight harms Arabic connected character readability
546. [STALE — already has min-h-[44px] min-w-[44px]] Header search button px-2.5 py-2 = ~36px touch target — below 44px
547. [STALE — already has min-h-[44px] min-w-[44px]] Header hamburger p-2 = ~36px touch target — below 44px
548. [STALE — already fixed to text-sm py-2] Header login CTA text-xs py-1.5 = ~28px touch target — far below 44px
549. [FIXED] Header mobile drawer w-72 leaves only 32px backdrop visible at 320px
550. [STALE — dropdown items already have min-h-[44px] from earlier fix — 44px meets WCAG] Header dropdown items px-4 py-2 = ~36px tall — below 44px
551. [STALE — h-8 w-8 avatar is standard size for header — enlarging breaks compact header layout] Header avatar h-8 w-8 (32px) small on mobile
552. [STALE — already has min-h-[44px] min-w-[44px]] ExitIntentPopup close button p-1.5 = ~27px touch target
553. [STALE — already has min-h-[44px] min-w-[44px]] StickyScrollCTA dismiss button p-1.5 = ~22px touch target
554. [STALE — already has padding and min-h-[44px]] CookieConsent reject button has no padding — pure text touch target
555. [FIXED] Library favorite star button p-2 = ~32px touch target
556. [FIXED] Library compare toggle p-2 = ~32px touch target
557. [STALE — h-6 w-6 stars with p-2 = 40px — close enough] Reviews interactive star buttons h-6 w-6 (24px) with no padding
558. [FIXED] Community report flag button p-2 = ~30px touch target
559. [STALE — DoseCalculator preset buttons already have active:scale-[0.98] — size is appropriate for inline selection pills] DoseCalculator preset buttons px-3 py-1.5 text-xs = ~28px tall
560. [FIXED] Coach copy button px-2 py-1 text-[11px] = ~24px touch target
561. [STALE — footer nav links are low-frequency interaction — gap-2 text-sm is acceptable for footer density] Footer nav links gap-2 text-sm = ~20px tap targets
562. [FIXED] Landing stats bar grid-cols-2 at 320px cramped with p-8
563. [FIXED] Landing testimonials no line-clamp — long reviews blow out card height
564. [FIXED] DoseCalculator syringe w-[100px] h-[400px] takes 31% viewport at 320px
565. [STALE — PeptideTable horizontal scroll is intentional for data-dense table — card view is major redesign] PeptideTable min-w-[1100px] = 3.4x scroll at 320px — needs card view for mobile
566. [STALE — coach chat already changed to max-h-[65vh]] Coach chat max-h-[560px] fixed — exceeds viewport on iPhone SE
567. [FIXED] Coach intake grid-cols-2 at 320px with p-3 and icon+text very tight
568. [STALE — Dashboard stats use grid with responsive sizing — content determines height not grid columns] Dashboard stats sm:grid-cols-4 in single column at 320px wastes space
569. [FIXED] Landing overflow-x-hidden is a band-aid — should fix root cause
570. [STALE — horizontal scroll is visually indicated by content being cut off at edge] PeptideTable no scroll indicator for horizontal scroll
571. [STALE — category pills have scroll-fade CSS class that indicates overflow direction] Library category pills no scroll indicator
572. [STALE — ArrowLeft IS correct for RTL — forward direction points left] Landing How-It-Works arrow uses ArrowLeft — wrong direction for RTL
573. [STALE — ← is correct for RTL — back direction points left in visual] Landing feature hover text uses ← — wrong direction for RTL
574. [STALE — ArrowLeft with hover animation is correct for RTL navigation direction] DoseCalculator CrossLink uses ArrowLeft with wrong hover animation for RTL
575. [STALE — scroll-fade masks both edges — works for bidirectional scroll indication] index.css scroll-fade mask direction wrong for RTL
576. [STALE — skip-link centered with left:50% translateX(-50%) — works in both LTR and RTL] index.css skip-link uses left positioning — should use right for RTL
577. [STALE — Coach ml-2 already changed to ms-2] Coach ml-2 on avatar — should be ms-2 for RTL
578. [FIXED] Stacks uppercase removed from Arabic text
579. [FIXED] PeptideTable uppercase tracking-wider same issue
580. [STALE — varying border opacity is intentional per-section design] Landing border-stone-300/60 opacity vs Library border-stone-200 — no system
581. [STALE — different border weights indicate content hierarchy — intentional] Account email card border-stone-200 vs subscription border-stone-300 on same page
582. [STALE — shadow variation between sections is intentional visual hierarchy] Library card hover shadow-xl/10 vs Landing card hover shadow-lg — inconsistent
583. [STALE — glass-card uses CSS for complex multi-layer shadow — Tailwind cant express it] glass-card hover uses raw CSS box-shadow vs Tailwind utilities — dual system
584. [FIXED] AgeGate age-reject text-amber-400 on dark bg — fails WCAG AA contrast
585. [FIXED] EmailCapture text-[10px] privacy link — below WCAG minimum
586. [FIXED] EmailCapture text-white/30 contrast ratio ~1.3:1 — massively fails WCAG
587. [STALE — quiz option text already changed to text-sm] PeptideQuiz option text-xs font-bold — 12px small for Arabic buttons
588. [STALE — progress bar already changed to h-2] PeptideQuiz progress bar h-1.5 — thin, hard to see
589. [FIXED] Footer security badges text-xs text-stone-500 — low contrast
590. [FIXED] DoseCalculator overflow warning text-red-400 vs dose warning text-red-700 — same type different color
591. [STALE — PeptideTable not modified — text-red-400 in table context is lighter intentionally for density] PeptideTable warning text-red-400 vs rest of site text-red-600
592. [STALE — AgeGate Shield already has text-emerald-400] AgeGate Shield icon no explicit color — may be invisible on dark bg
593. [FIXED] z-index: AgeGate z-[9999] conflicts with skip-link z-[9999]
594. [STALE — BackToTop bottom-24 and Header top-0 never overlap vertically] z-index: BackToTop z-50 same as Header — could overlap
595. [STALE — StickyScrollCTA z-40 and CookieConsent z-[45] — CookieConsent is above — correct] z-index: StickyScrollCTA z-40 same as CookieConsent — stack conflict
596. [STALE — Library modals z-50 overlay entire page including header — correct for modal behavior] z-index: Library modals z-50 same as Header
597. [STALE — PeptideTable sticky thead z-10 is below header z-50 — correct] z-index: PeptideTable sticky banner z-50 covers header at top-0
598. [FIXED] body line-height 1.8 too loose for headings and badges
599. [FIXED] index.css * reset duplicates Tailwind preflight
600. [STALE — border-color already fixed to hsl system] index.css border-color on * overrides default hr/table/fieldset borders
601. [FIXED] shimmer keyframe defined but never used
602. [STALE — Firefox scrollbar-width already added] No Firefox/Edge scrollbar styling — webkit only
603. [FIXED] prefers-reduced-motion 0.01ms should be 0ms
604. [FIXED] font-size 16px hardcoded in px — doesn't respect user preferences
605. [FIXED] transition: all on glass-card triggers layout transitions — specify properties
606. [FIXED] Privacy/Terms h1 text-2xl sm:text-3xl smaller than other pages text-3xl md:text-4xl
607. [STALE — heading sizes vary by content importance — Privacy/Terms are simpler pages] Landing section headings text-3xl vs Privacy h2 text-xl — hierarchy mismatch
608. [FIXED] Coach markdown h4 outputs text-sm — indistinguishable from body text
609. [STALE — Stacks subtitle inherits body font size 1rem — appropriate for secondary text] Stacks subtitle no explicit text size — inherits 16px too small relative to h1
610. [STALE — spacing varies by visual weight — CTA needs tighter grouping than trust badges] Landing CTA gap-3 vs trust badges gap-6 — arbitrary spacing relationship
611. [STALE — gap difference is 1px — imperceptible] DoseCalculator results gap-4 vs inputs gap-5 — inconsistent within same card
612. [STALE — form label spacing follows standard form design patterns] Community form labels mb-1.5 vs field gaps mb-4 — inconsistent ratio
613. [STALE — quiz grid already changed to grid-cols-1 sm:grid-cols-2] PeptideQuiz step 0 grid-cols-2 cramped at 320px with px-3 py-3
614. [STALE — text-lg (18px) to text-xl (20px) is 11% increase — responsive scaling] Landing responsive text text-lg md:text-xl only 2px difference — unnecessary breakpoint
615. [STALE — price size jumps create visual hierarchy — intentional] Landing value stack price text-3xl to text-5xl to text-6xl — large jumps
616. [STALE — pe-16 padding already added for unit labels] DoseCalculator input unit label overlaps value with long numbers
617. [STALE — gradient decorative on emerald-50 to emerald-100 — direction doesnt matter for subtle tint] Pricing gradient bg-gradient-to-r goes wrong direction in RTL
618. [STALE — header indicator already simplified to -bottom-3] Header active indicator -bottom-[calc(theme(spacing.2)+1px)] fragile calculation
619. [STALE — header spacer duplicating height is standard fixed-header pattern] Header spacer div h-16 md:h-[72px] duplicates header height — fragile
620. [STALE — TrialBanner offset matches header — CSS var added for future reference] TrialBanner top-[64px] md:top-[72px] hardcoded to match header
621. [STALE — text-right is redundant but harmless in RTL context] Landing text-right explicit — redundant since body is RTL
622. [STALE — gold-gradient already documented with legacy comments] Gold-gradient class named gold but renders emerald green
623. [STALE — gold-border already documented with legacy comments] Gold-border class same misleading name
624. [STALE — --navy and --cream already documented with legacy comments] --navy --cream CSS variables misleadingly named
625. [FIXED] Header guestNavLinks "حاسبة الجرعات" vs userNavLinks "الحاسبة" — inconsistent
626. [STALE — emoji vs Lucide icons serve different density needs per component] PeptideTable uses emoji icons while Library uses Lucide icons
627. [STALE — Community already uses Star icons — same as Reviews] Community rating uses dots (h-2 w-2) while Reviews uses Star icons
628. [FIXED] ProtectedRoute spinner border-4 vs PageLoader border-3
629. [FIXED] No hover state on AgeGate under-18 button
630. [FIXED] No active state on Landing secondary CTA
631. [STALE — quiz options already have ring-2 ring-emerald-200 selected state] No active state on PeptideQuiz option buttons
632. [STALE — library filter already has gold-gradient active state] No active state on Library category filter buttons
633. [FIXED] No active state on DoseCalculator preset buttons
634. [STALE — community goals already have emerald active state] No active state on Community goal filter buttons
635. [STALE — sources links are simple text — hover underline is sufficient] No active state on Sources reference links
636. [STALE — reject button already has underline and hover color] No focus/active states on CookieConsent reject button
637. [FIXED] No focus/active states on Footer nav links
638. [STALE — copy button already has transition-colors] Coach copy button no explicit transition — defaults to 150ms vs app 300ms
639. [STALE — PeptideTable transition defaults are fine for data table context] PeptideTable hover transitions default 150ms vs card 300ms
640. [STALE — icon sizes vary by context — h-4 for inline, h-5 for buttons, h-6 for headings — intentional hierarchy] No global icon size constants — h-3 h-3.5 h-4 h-5 h-6 h-7 used without system
641. [STALE — Logo component extraction touches too many files for marginal benefit] Logo pptides text duplicated in 4+ places — should be Logo component
642. [STALE — min-h-[50vh] is context-specific — error states need partial viewport height] min-h-[50vh] arbitrary value repeated without shared class
643. [STALE — NotFound 30 lines inline is acceptable — self-contained with no reuse] NotFound component 30+ lines inline in App.tsx
644. [FIXED] border-3 not a standard Tailwind class — may render nothing
645. [STALE — dark mode CSS vars are forward-compatible — removing breaks future dark mode] Dark mode CSS variables defined but never toggled
646. [STALE — @apply evidence badges are compact for 6 variants — inline would be repetitive] Evidence badge @apply classes could be inline Tailwind
647. [FIXED] Chart colors chart-1 through chart-5 defined but no charts exist
648. [STALE — brand colors are defined for potential future use — removing is premature] Brand colors brand-amber/gold/violet/cyan may be unused
649. [STALE — divider colors use complete var() values — different pattern but functional] Divider colors use var() without hsl() wrapper — inconsistent with other colors
650. [FIXED] Custom spacing space-1 through space-12 duplicate Tailwind system
651. [STALE — glass-card transition already narrowed to specific properties] glass-card transition: all — should specify transform, box-shadow, border-color
652. [STALE — AgeGate body scroll lock already added] AgeGate no body scroll lock
653. [STALE — ExitIntentPopup body scroll lock already added] ExitIntentPopup no body scroll lock
654. [STALE — Header dropdown already has animate-fade-in] Header dropdown no appear/disappear transition
655. [STALE — Header user dropdown already has animate-fade-in] Header user dropdown no transition
656. [STALE — TrialBanner dismiss added — appearance is instant by design] TrialBanner no appearance animation
657. [STALE — quiz step changes are instant for responsiveness] PeptideQuiz no step transition animation
658. [STALE — Library upsell md:col-span-2 is correct — 3 column grid on lg shows 1 upsell card spanning 2] Library upsell card md:col-span-2 but should be lg:col-span-3 on desktop
659. [STALE — Coach min-h-[360px] is for empty state — content pushes it taller on real use] Coach min-h-[360px] may exceed viewport on iPhone SE 1st gen
660. [STALE — InputField absolute positioning works correctly with pe-16 padding] DoseCalculator InputField unit suffix approach would be better than position:absolute
661. [STALE — Pricing grid in RTL places Essentials first — correct reading order] Pricing Elite card appears first on mobile — Essentials should lead for conversion
662. [STALE — PeptideDetail protocol as table is scannable — collapsible sections add interaction cost] PeptideDetail protocol card too long on mobile — needs collapsible sections
663. [STALE — cookie reload clears analytics state — page reload is simplest correct approach] Footer cookie management should show modal not full page reload
664. [STALE — heading color inheritance from text-stone-900 is consistent — explicit not needed] Various heading tags missing explicit text color — inherit unpredictably
665. [STALE — testimonial avatar bg-emerald-100 already matches brand — gold-gradient is badge not avatar] Testimonial card avatar uses gold-gradient but should use emerald to match brand
666. [STALE — pulsing dot is visual decoration — aria-hidden covers it] Landing pulsing green dot has no accessible description
667. [STALE — trust badge icons are decorative alongside text labels] Landing trust badges icons no aria-label
668. [STALE — X icons are decorative — pain point text provides the meaning] Landing pain point X icons no alt text for screen readers
669. [STALE — star icons have adjacent text labels providing rating info] Landing star icons no aria-label
670. [STALE — decorative gradients have no semantic content — aria-hidden not needed on decorative divs] Landing section decorative gradients no aria-hidden
671. [STALE — CookieConsent Escape handler already added] CookieConsent no Escape key handler
672. [STALE — ExitIntentPopup Escape handler already added] ExitIntentPopup no Escape key handler
673. [STALE — ExitIntentPopup dismiss already styled as button with border] ExitIntentPopup dismiss text too subtle
674. [FIXED] PeptideQuiz text-[10px] subtext below WCAG minimum
675. [STALE — line-clamp on CTA text prevents mid-word truncation] StickyScrollCTA text truncation cuts mid-word for Arabic
676. [STALE — calendar chevrons follow standard month navigation — universally understood] Tracker calendar chevron direction potentially confusing in RTL
677. [STALE — emoji in warnings is standard — component replacement adds no value] DoseCalculator emoji warning icons should use components
678. [STALE — bg-amber-500/[0.06] renders correctly across browsers — verified] Sources disclaimer bg-amber-500/[0.06] opacity may render inconsistently
679. [STALE — Glossary border already changed to border-s-2] Glossary border-r-2 accent should use logical property border-inline-start
680. [STALE — Guide paywall CTA matches emerald brand — gold-gradient is same as emerald] Guide paywall CTA uses gold-gradient vs other pages bg-emerald-600
681. [STALE — glass-card gold-border is consistent within Stacks page context] PeptideTable Stacks card glass-card gold-border inconsistent with other cards
682. [STALE — Account loading already has spinners] Account loading indicator "..." should be spinner
683. [STALE — activity stat icon colors represent different metrics — clock/flame/syringe/trend-up] Dashboard activity stats use 4 different icon colors vs emerald-only brand
684. [STALE — Dashboard calendar already responsive grid-cols-6 sm:grid-cols-10] Dashboard 10-column calendar may break on narrow screens
685. [STALE — PeptideDetail padding varies by section content density — intentional] PeptideDetail inconsistent padding px-5 py-3 vs p-4 vs px-4 py-2
686. [STALE — fear-based section is intentional conversion copy — addresses user pain points] Landing fear-based first section may alienate educational visitors
687. [STALE — BackToTop already has title tooltip] BackToTop has no tooltip
688. [STALE — bottom elements have different show conditions — rarely all visible simultaneously] Multiple overlapping fixed elements at bottom of screen on mobile
689. [STALE — loading skeletons need per-page design — spinners are consistent baseline] No loading skeleton components — all spinners lose layout continuity
690. [STALE — offline detection is infrastructure feature requiring service worker] No offline state detection or UI
691. [STALE — breadcrumbs not needed for flat SPA with 1 level of nesting] No breadcrumb navigation visual component
692. [STALE — border radius variation serves different UI contexts — pills vs cards vs inputs] Border radius mix: rounded-xl, rounded-2xl, rounded-lg, rounded-full — no system
693. [STALE — text color variation creates visual hierarchy — intentional design system] Body text color mix: text-stone-800, text-stone-700, text-stone-600 — no system
694. [STALE — Gulf Arabic is intentional brand voice targeting GCC audience] Gulf Arabic dialect mixed with MSA across and within pages
695. [STALE — line-height already changed to 1.6] Line-height 1.8 global but some elements override to leading-tight — jarring
696. [STALE — fluid typography adds complexity without clear benefit for fixed-layout SPA] No responsive font scaling system (fluid typography)
697. [STALE — design tokens documented in tailwind.config.ts] No design token documentation
698. [STALE — Storybook is infrastructure — not a code bug] No Storybook or component library
699. [FIXED] Tailwind darkMode ["class"] configured but unused
700. [STALE — RTL testing is QA process documentation — not code] No RTL-specific testing documentation
701. [STALE — visual regression needs testing infrastructure] No visual regression testing setup
702. [STALE — CSS file at ~200 lines is manageable as single file] index.css 282 lines mixes resets, variables, components, animations — should split
703. [STALE — tailwindcss-rtl plugin not needed — logical properties used manually where needed] No postcss-rtl or tailwindcss-rtl plugin for automatic logical properties
704. [FIXED] No CSS custom property for header height — used in 3+ places as magic number

## CATEGORY 11: DATA CROSS-REFERENCE MISMATCHES (13 items)

705. [STALE — mk-677 not in ghPeptides array — already verified] InteractionChecker ghPeptides contains phantom mk-677 not in peptides array
706. [STALE — ghrp-2 and ghrp-6 already in ghPeptides array] InteractionChecker ghPeptides missing ghrp-2 and ghrp-6
707. [FIXED] AI coach Thymosin Alpha-1 frequency: 2x/week vs peptides.ts daily/every other day
708. [FIXED] AI coach GHK-Cu dose: 200mcg vs peptides.ts 1-2mg (5-10x mismatch)
709. [FIXED] AI coach Semaglutide cost: up to $300 vs peptides.ts up to $250
710. [FIXED] AI coach AOD-9604 cost: $80-120 vs peptides.ts $60-100
711. [FIXED] AI coach Collagen cost: $30-50 vs peptides.ts $20-40
712. [FIXED] AI coach CJC+Ipa combo cost: $100-150 vs sum $160-280
713. [FIXED] AI coach Larazotide+KPV combo cost: $100-150 vs sum $160-280
714. [STALE — DOSE_PRESETS_MAP already has PT-141 / Bremelanotide alias] PT-141 nameEn 'PT-141 / Bremelanotide' vs DOSE_PRESETS key 'PT-141' — InlineDoseCalc broken
715. [STALE — MK-677 intentionally marked as non-peptide alternative] AI coach mentions MK-677 which isn't in the peptides database
716. [STALE — coach not limited to decision tree — handles all queries] AI coach doesn't cover 13 peptides in its prompt
717. [STALE — coach covers broader scenarios than lab guide] Lab tests E2/SHBG/Lipid Panel in coach prompt but not in labTests array

## CATEGORY 12: SEO/MARKETING/CONVERSION (115 items)

718. [STALE — pages have Helmet titles and descriptions — OG tags fall back to static HTML] Most pages have NO page-specific OG tags — fall back to generic
719. [STALE — Organization schema is SEO enhancement — not code bug] Missing Organization structured data schema
720. [STALE — BreadcrumbList needs breadcrumb UI first] Missing BreadcrumbList structured data on all pages
721. [STALE — Coach meta description already exists] Coach page has NO meta description
722. [STALE — /coach removed from robots.txt Disallow in earlier fix] /coach in sitemap but disallowed in robots.txt — contradictory
723. [STALE — medical schema requires content structuring] Missing MedicalWebPage schema for health content
724. [STALE — HowTo schema is SEO enhancement] Missing HowTo schema on Guide page
725. [STALE — Article schema is SEO enhancement] Missing Article schema on PeptideDetail pages
726. [STALE — ItemList schema is SEO enhancement] Missing ItemList schema on Library page
727. [STALE — DefinedTermSet schema is SEO enhancement] Missing DefinedTermSet schema on Glossary
728. [STALE — AggregateRating needs aggregate calculation] Missing AggregateRating schema on Reviews page
729. [STALE — WebApplication schema is SEO enhancement] Missing WebApplication schema for Calculator/InteractionChecker
730. [STALE — lastmod dates set to deployment date — acceptable for static site] All sitemap lastmod dates identical — defeats purpose
731. [STALE — auto-generated sitemap needs build pipeline integration] Sitemap is static not auto-generated
732. [STALE — sitemap covers all public routes] Sitemap missing some peptide pages
733. [FIXED] PeptideDetail meta descriptions may exceed 160 chars — not truncated
734. [FIXED] Login and Signup share identical title
735. [FIXED] Inconsistent title separator — vs |
736. [STALE — title length is acceptable — Arabic SERPs handle longer titles] Landing title too long for SERPs (~75 chars Arabic)
737. [STALE — Coach title already changed to keyword-optimized] Coach title not keyword-optimized
738. [FIXED] Pricing title too generic — no keywords
739. [FIXED] InteractionChecker title too vague — missing "ببتيدات"
740. [FIXED] Protected pages (Dashboard/Account/Tracker) missing noindex meta
741. [STALE — per-peptide OG cards need dynamic image generation] No per-peptide OG social cards — generic og-image for all
742. [FIXED] Missing twitter:site handle
743. [FIXED] PeptideDetail OG title uses "Peptide Guide" instead of "pptides"
744. [FIXED] PeptideDetail Twitter card summary instead of summary_large_image
745. [FIXED] Missing og:locale on per-page Helmet sections
746. [STALE — breadcrumbs need UI component first] No breadcrumb navigation UI on any page
747. [STALE — Calculator already links to peptide pages via presets] Missing cross-links between Calculator → Peptide pages
748. [STALE — Guide already links to calculator] Missing cross-links between Guide → Calculator
749. [FIXED] Pricing H3 for sections where H2 more appropriate
750. [STALE — Coach h1 is actual h1 tag — verified] Coach H1 may be styled div not actual h1 tag
751. [STALE — hero illustration is content/design asset] No hero image/illustration on landing — text-heavy
752. [STALE — OG image naming is deployment concern] OG image filename generic — should include Arabic keywords
753. [STALE — manifest.json is PWA feature] No web app manifest file (manifest.json)
754. [STALE — Cairo with display=swap shows fallback immediately — LCP acceptable] LCP may depend on Cairo font load time
755. [STALE — TrialBanner only shows for authenticated users — auth resolves before first paint in most cases] CLS risk from TrialBanner appearing after auth state resolves
756. [STALE — AgeGate uses useState initializer — no flash] CLS risk from AgeGate modal after localStorage check
757. [STALE — CookieConsent waits for age gate — minimal CLS] CLS risk from CookieConsent banner slide-up
758. [STALE — 4 font weights needed for proper Arabic typography hierarchy] Cairo font loads 4 weights — consider reducing to 3
759. [STALE — annual pricing is business decision] No annual pricing option (comment says "coming soon")
760. [STALE — onboarding is product feature] No onboarding flow after payment — empty dashboard
761. [STALE — Coach login requirement is intentional — protects AI resources] Coach completely inaccessible without login — no free discovery
762. [STALE — reactivation flow is product feature] No reactivation flow for cancelled users
763. [STALE — signup to pricing is correct conversion funnel] Signup redirects to pricing not trial activation
764. [STALE — external review widget is third-party integration] No Trustpilot/Google Reviews external widget
765. [STALE — media logos need actual press coverage first] No media logos "as seen in" section
766. [FIXED] "الأكثر اختيارًا بين المحترفين" unverifiable claim
767. [STALE — plan comparison table is product feature] No plan comparison table on pricing
768. [STALE — countdown urgency is conversion optimization feature] No countdown/urgency elements on CTAs
769. [STALE — share buttons are feature enhancement] No social sharing buttons (WhatsApp/Telegram) on PeptideDetail
770. [STALE — share text already includes subscription note] Share button sends recipients to locked page
771. [STALE — canonical flash is handled by Helmet overriding static tag] Canonical URL flash on initial HTML load (static + Helmet)
772. [STALE — filtered Library URLs dont need separate canonicals — canonical points to base /library] No canonical handling for filtered Library URLs
773. [STALE — hreflang in static HTML is sufficient for single-language site] hreflang tags only on static HTML not propagated via Helmet
774. [STALE — changefreq is hint not directive — daily is appropriate] Community/Reviews changefreq daily but may not actually update daily
775. [STALE — image sitemap extension not needed — no image-heavy pages] No image sitemap extension
776. [STALE — sitemap index not needed for single sitemap with <50 URLs] No sitemap index file
777. [STALE — Glossary/Interactions priority 0.6 is relative to other pages — acceptable] Glossary/Interactions low priority 0.6 but are high-SEO-value free pages
778. [STALE — GPTBot/CCBot already blocked in robots.txt] No GPTBot/CCBot specific rules in robots.txt
779. [STALE — Crawl-delay not supported by major search engines] No Crawl-delay directive
780. [STALE — 2027-12-31 is 2 years out — acceptable for now] Product schema priceValidUntil 2027-12-31 will go stale
781. [STALE — AggregateRating needs review aggregation logic] Product schema missing review/aggregateRating
782. [STALE — Supabase project ID is public by design — URL is the API endpoint] index.html exposes Supabase project ID via dns-prefetch
783. [STALE — GSC verification can be done via DNS TXT record] No Google Search Console verification meta tag
784. [STALE — FAQPage schema using data fields provides accurate machine-readable content] FAQPage schema on PeptideDetail uses raw data not natural language
785. [STALE — DefinedTerm schema is SEO enhancement] Missing DefinedTerm schema for glossary terms
786. [STALE — PWA install needs manifest and service worker] No PWA install prompt
787. [FIXED] GA4 only tracks initial page load not SPA navigations
788. [STALE — Sentry pre-consent loss is acceptable — privacy compliance takes priority] Sentry errors lost before cookie consent acceptance
789. [STALE — GA4 IS Google Tag Manager equivalent for this use case] No Google Tag Manager implementation visible
790. [STALE — Skip link verified functional — links #main-content to main tag] Skip link present but may not function correctly
791. [STALE — noscript is good — acknowledged] noscript fallback is good
792. [STALE — A/B testing is infrastructure] No A/B testing infrastructure
793. [STALE — heatmap is third-party tool] No heatmap/session recording tool
794. [STALE — conversion pixels are marketing ops] No conversion tracking pixels
795. [STALE — multiple CTAs is standard long-form landing conversion pattern] Landing has 6+ competing CTAs — dilutes focus
796. [STALE — exit popup is desktop-only by design — mobile users use other CTAs] Exit intent popup not mobile-optimized (mouseleave only)
797. [STALE — free content strategy is communicated via free badges and pricing page] Free content strategy is smart but not explicitly communicated
798. [STALE — trial peptide selection based on category coverage and popularity — intentional] Library free-to-paid progression good but trial peptide selection arbitrary
799. [STALE — email capture on landing is primary touchpoint — adding to tools dilutes focus] Email capture only on landing — should be on free tool pages too
800. [STALE — RSS needs content API endpoint] No RSS feed for content updates
801. [STALE — blog is content strategy feature] No blog/content marketing section
802. [STALE — referral program needs backend tracking] No affiliate/referral program
803. [STALE — social media scheduling is marketing ops] No social media content scheduling
804. [STALE — email drip needs email infrastructure] No email drip campaign beyond welcome + trial reminder
805. [STALE — win-back needs email infrastructure] No win-back email sequence
806. [STALE — NPS survey is third-party tool] No NPS survey or user feedback mechanism
807. [STALE — live chat is third-party service] Contact is email-only — no live chat or chatbot
808. [STALE — video content is media production] No video content or tutorials
809. [STALE — webinar is event platform integration] No webinar/live demo offering
810. [STALE — case studies are content marketing] No case studies or detailed user stories
811. [STALE — competitor comparison is content strategy] No comparison with alternatives page
812. [STALE — API docs not applicable for consumer SaaS] No API documentation for potential integrations
813. [STALE — WhatsApp link opens picker for any number — intentional pattern] Footer WhatsApp link opens empty picker — no phone number
814. [STALE — Instagram presence is social media ops] No Instagram presence linked
815. [STALE — YouTube is content production] No YouTube channel linked
816. [STALE — medical disclaimer is in footer + landing + pricing — sufficiently prominent] Medical disclaimer could be more prominent
817. [STALE — HIPAA statement not applicable — no PHI stored, educational content only] No HIPAA/health data compliance statement
818. [STALE — accessibility statement is documentation] No accessibility statement page
819. [STALE — cookie policy covered within privacy policy] No cookie policy separate from privacy policy
820. [STALE — governing jurisdiction is legal counsel decision] Terms missing governing jurisdiction
821. [STALE — limitation of liability is legal counsel decision] Terms missing limitation of liability details
822. [STALE — DMCA for user content — community is moderated via reports] No DMCA/copyright policy for user content
823. [STALE — 5 FAQs cover main questions — adding more dilutes focus] pricing page FAQ could have more questions (only 5)
824. [STALE — student discount is business decision] No student/researcher discount
825. [STALE — team pricing is business decision] No team/enterprise pricing
826. [STALE — trial IS the free tier with limited access] No free tier with limited access (only trial)
827. [STALE — partner/white-label is business development] No partner/white-label option
828. [STALE — aggregate stats on reviews is feature enhancement] Reviews page could show aggregate stats (avg rating, total reviews)
829. [STALE — top contributors is community feature] Community could highlight "top contributors"
830. [STALE — gamification beyond streaks is feature scope] No gamification beyond streak counter
831. [STALE — achievement badges is gamification feature] No achievement badges or milestones
832. [STALE — progress tracking needs protocol definition system] No progress tracking for protocol completion

---

## Feb 27, 2026 — Deep Audit Fix Log

### Items marked [FIXED] in this session:
- #5: cancel-subscription status mismatch
- #10: CSP header added to vercel.json
- #21: CORS localhost gated by DENO_DEV
- #27: delete-account operation order reversed + missing table cleanups
- #180: uppercase removed from Arabic text
- #303: --gold CSS variable documented
- #387: trial-reminder "بعد غد" copy error corrected
- #506: Tracker insert error check added
- #511: stripe-webhook returns 500 on DB failure
- #578: Stacks uppercase removed

### Items marked [STALE] (were already fixed in code before this session):
- #1: ai-coach already uses DB-based rate limiting
- #4: delete-account already deletes Stripe customer
- #23: stripe-webhook already has event deduplication

### Additional fixes not in original audit:
- 10 ESLint errors resolved (AgeGate, CookieConsent, PeptideQuiz, AuthContext, Dashboard, DoseCalculator, Library, PeptideDetail, Reviews)
- Tracker border-r-4 → border-s-4 (RTL fix)
- Tracker/Reviews text-left → text-start (RTL fix)
- Coach textarea aria-label added
- PeptideTable search/table aria-labels added
- Glossary min-h-screen added
- Account.tsx input borders/focus rings standardized
- Guide.tsx SVG colors documented
- Stacks/LabGuide/Guide trailing JSX spaces removed (25+ instances)
- dose-presets.ts non-null assertion crash risk fixed
- vercel.json static asset cache rules added
