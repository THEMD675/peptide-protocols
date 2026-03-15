# pptides Deep Audit — March 2026

> **Context**: App built by multiple AI agents. Don't trust the code against what's really in the browser. The more you think you got it, the deeper you should dig.

## Executive Summary

| Area | Code Says | Reality | Status |
|------|-----------|---------|--------|
| Peptide count | 48 (`PEPTIDE_COUNT`) | **47** (peptides-public.ts) | 🔴 **MISMATCH** |
| Cursor rules | "41+ peptides" | Stale (years old) | 🔴 **STALE** |
| Edge functions | Default 47 | Correct | ✅ |
| Lab tests | 11 | 11 | ✅ |
| Local dev | — | **Crashes** (missing Supabase env) | 🔴 |
| Production (pptides.com) | — | Renders fully | ✅ |

---

## 1. Peptide Count Drift (CRITICAL)

**The app advertises 48 peptides everywhere. The data has 47.**

### Evidence

```bash
# Actual count in peptides-public.ts
$ grep -c 'id: "' peptides-public.ts → 47
```

| Location | Value | Source |
|----------|-------|--------|
| `src/lib/constants.ts` | `PEPTIDE_COUNT = 48` | Hardcoded |
| `constants.ts` comment | "47 peptides, 7 free" | Correct |
| `index.html` | "48 ببتيد" | Meta, structured data |
| `GuidedTour.tsx` | "48 ببتيد" | Tour copy |
| `Landing.tsx` | "48 ببتيد" | Multiple CTAs |
| Supabase edge functions | `PEPTIDE_COUNT ?? '47'` | trial-reminder, trial-day2, send-welcome-email, onboarding-drip |

**Root cause**: Multi-agent edits. One agent updated `PEPTIDE_COUNT` to 48 without adding a peptide. Or a peptide was removed and the constant never decremented.

**Fix**: Either add the 48th peptide or set `PEPTIDE_COUNT = 47` and update all UI copy. Standards doc says "derived from peptides.length" — implement that:

```ts
// constants.ts should derive, not hardcode
import { peptidesPublic } from '@/data/peptides-public';
export const PEPTIDE_COUNT = peptidesPublic.length;
```

---

## 2. Local Development: Broken Without Env

**Local `npm run dev` never renders the app.**

- `src/lib/supabase.ts` throws at import: `FATAL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY`
- React crashes before hydration; `#root` stays empty (skeleton only)
- Console: uncaught error, no React tree

**Implication**: You cannot verify code changes locally unless `.env.local` has valid Supabase keys. Any agent making edits without running the app will be flying blind.

**Fix**: Add a dev-only fallback (dummy URL/key) so the app at least renders and can be audited. Or document that local dev requires `.env.local` and provide `.env.example`.

---

## 3. Cursor Rules / Documentation Drift

| Doc | Claims | Actual |
|-----|--------|--------|
| `.cursor/rules/pptides-codebase.mdc` | "41+ peptides" | 47 peptides |
| Standards: "PEPTIDE_COUNT derived from peptides.length" | Should be derived | It's hardcoded 48 |
| Standards: "FREE_PEPTIDE_IDS must stay in sync with isFree:true" | 7 free | ✅ Matches (7 in both) |

**Implication**: Agents reading cursor rules will use wrong counts (41 vs 47) and may introduce more drift.

---

## 4. Production vs Code

**Production (https://pptides.com)**: Loads correctly. Landing, header, footer, Library route all render. Snapshot shows 239 refs, 82 interactive elements. Copy consistently says "48 ببتيد".

**Reality check**: If Library renders 47 cards, users see 47 while the site says 48. That's a trust/accuracy issue.

---

## 5. Data Consistency Checklist

| Item | Data | Constants/UI | Synced? |
|------|------|--------------|---------|
| Peptides | 47 | 48 | ❌ |
| Free peptides | 7 | 7 (FREE_PEPTIDE_IDS) | ✅ |
| Lab tests | 11 | "11 تحليل" | ✅ |
| Categories | 6 | 6 | ✅ |
| Stacks | 5 | 5 | ✅ |

---

## 6. Agent-Created Drift Risks

1. **Constants vs data**: Multiple places define "count" or "free IDs". Agents edit one and miss others.
2. **Generated files**: `peptides-public.ts` is generated ("Generated: 2026-03-12"). If generation script uses different source than `peptides.ts`, drift can happen.
3. **Edge functions**: Each has `PEPTIDE_COUNT` from env with fallback `'47'`. If deployed without `PEPTIDE_COUNT`, they use 47. Frontend uses 48 from constants. Inconsistent.
4. **SEO/copy**: index.html, Landing, Pricing, FAQ all hardcode "48". A single constant won't fix those unless they import it.

---

## 7. Recommendations (Before Any Fixes)

1. **Stop and verify**: Run `peptidesPublic.length` and confirm 47. Do NOT add a peptide just to match 48 unless you have real content.
2. **Single source of truth**: Derive `PEPTIDE_COUNT` from `peptidesPublic.length` in constants.ts. Re-export. All UI and edge functions should use that.
3. **Sync cursor rules**: Update pptides-codebase.mdc to say "47 peptides" (or whatever the count is after you fix).
4. **Local dev**: Either require `.env.local` and document it, or add a mock Supabase client for dev so the app at least renders.
5. **Audit script**: Add a `scripts/audit-counts.mjs` that:
   - Counts peptides in peptides-public
   - Counts FREE_PEPTIDE_IDS
   - Compares to PEPTIDE_COUNT and fails if mismatch
   - Run in CI

---

## 8. What NOT to Do

- **Don't** change 48→47 in constants and assume you're done. Every hardcoded "48" in UI copy must be updated or switched to the constant.
- **Don't** add a placeholder 48th peptide to satisfy marketing copy.
- **Don't** trust code comments. Verify against actual data (greps, runtime checks).
- **Don't** fix one thing and move on. This audit found 1 major drift; there may be more (pricing copy, trial days, etc.).

---

## 9. Files to Reconcile

If you fix PEPTIDE_COUNT to 47 (or derive it), these need review:

- `src/lib/constants.ts` — PEPTIDE_COUNT
- `index.html` — meta, structured data
- `src/components/GuidedTour.tsx` — "48 ببتيد"
- `src/pages/Landing.tsx` — multiple "48" references
- `src/pages/Pricing.tsx` — feature lists
- `supabase/functions/*` — PEPTIDE_COUNT env vs default
- `.cursor/rules/pptides-codebase.mdc` — peptide count
- `vercel.json` / deployment env — PEPTIDE_COUNT if used

---

*Audit performed via browser snapshot, console, network, and codebase grep. Production tested on https://pptides.com. Local tested on localhost:3004 (crashed).*
