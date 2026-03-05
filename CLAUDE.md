# CLAUDE.md — Agent Instructions for pptides.com

## Project
Arabic peptide education SaaS. React/Vite/TS + Supabase + Stripe + Vercel.
Premium product — 371 SAR/month. Must be world-class.

## Before Any Work
1. Read `TASK_QUEUE.md` — pick the next unchecked task
2. Do the work
3. Mark it done in `TASK_QUEUE.md` with date
4. Run: `npx eslint . && npx tsc --noEmit && npx vitest run && npm run build`
5. If clean: `git add -A && git commit -m "fix: [what you did]" && git push origin main && vercel --prod --yes`
6. Update `TASK_QUEUE.md`
7. Move to next task

## If Context Gets Long
Commit what you have, update TASK_QUEUE.md, and exit cleanly. Next session picks up.

## Quality Standards
- Zero lint errors, zero TS errors, all tests pass
- Every page works on mobile (375x812)
- All Arabic, RTL everywhere
- WCAG touch targets (44px min)
- No console.log in production
- Every public page: unique title, description, og tags, JSON-LD

## Deploy
Always run `vercel --prod --yes` after pushing. GitHub Actions deploy is broken (expired token).
After deploy: `openclaw system event --text "Deployed: [summary]" --mode now`
