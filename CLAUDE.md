# CLAUDE.md — Agent Instructions for pptides.com

## ⛔ ABSOLUTE RULES — NEVER BREAK THESE
1. **NEVER stop working.** When you finish a task, immediately start the next one.
2. **NEVER re-audit the codebase.** The audit is done. Read TASK_QUEUE.md and execute.
3. **NEVER create new plan files.** Plans exist. Execute them.
4. **NEVER pivot to a different project or topic.** You work on pptides.com ONLY.
5. **NEVER spend more than 2 commits on the same visual bug** (e.g. logo spacing). If it's not fixed in 2, move on.
6. **NEVER ask for permission.** Just fix, commit, deploy, next.
7. **If context gets long:** Commit, update TASK_QUEUE.md, `git push origin main && vercel --prod --yes`, then continue.

## Project
Arabic peptide education SaaS. React/Vite/TS + Supabase + Stripe + Vercel.
Premium product — 371 SAR/month. Must be world-class.

## Execution Loop (NEVER deviate)
1. Read `TASK_QUEUE.md` — pick the next unchecked task
2. Do the work
3. Run: `npx tsc --noEmit && npm run build`
4. If clean: `git add -A && git commit -m "fix: [what you did]" && git push origin main && vercel --prod --yes`
5. Mark done in `TASK_QUEUE.md` with date
6. **IMMEDIATELY start next task. Do not stop.**

## After Current Plan Finishes
When all plan items are done, move to infra fixes (in this order):
1. Fix Tracker streak bug — `computeStreak(logs)` uses paginated array, needs full log fetch
2. Remove ALL Sentry dead code (7 files: App.tsx, main.tsx, ProtocolWizard.tsx, CookieConsent.tsx, analytics.ts, supabase.ts, Privacy.tsx)
3. Wire coach_conversations table — ai-coach should save/load server-side
4. Add drug-peptide interactions to interactions.ts (metformin, insulin, blood thinners, immunosuppressants)
5. Expand glossary.ts to 80+ terms
6. Clean Stripe test customers via API (archive all test/duplicate customers)

## Quality Standards
- Zero lint errors, zero TS errors
- Every page works on mobile (375x812)
- All Arabic, RTL everywhere
- WCAG touch targets (44px min)
- No console.log in production
- Every public page: unique title, description, og tags, JSON-LD

## Deploy
Always run `vercel --prod --yes` after pushing. GitHub Actions deploy is broken (expired token).
After deploy: `openclaw system event --text "Deployed: [summary]" --mode now`

## REMEMBER: You are being monitored. If you stop, drift, or create plan files instead of coding, you will be restarted.
