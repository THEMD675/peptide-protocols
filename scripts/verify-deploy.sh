#!/usr/bin/env bash
# verify-deploy.sh — Pre-deploy regression test for pptides.com
# Run before every deploy: ./scripts/verify-deploy.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

pass() { ((PASS++)); echo -e "${GREEN}✓${NC} $1"; }
fail() { ((FAIL++)); echo -e "${RED}✗${NC} $1"; }
warn() { ((WARN++)); echo -e "${YELLOW}⚠${NC} $1"; }

SITE="https://pptides.com"

echo "═══════════════════════════════════════════"
echo "  pptides.com Pre-Deploy Verification"
echo "═══════════════════════════════════════════"
echo ""

# ─── 1. Build ────────────────────────────────────────────
echo "── Step 1: Build ──"
if pnpm build > /tmp/pptides-build.log 2>&1; then
  pass "pnpm build succeeded"
else
  fail "pnpm build FAILED"
  echo "  Last 20 lines of build output:"
  tail -20 /tmp/pptides-build.log | sed 's/^/  /'
  echo ""
  echo -e "${RED}Build failed. Aborting.${NC}"
  exit 1
fi
echo ""

# ─── 2. Route checks ────────────────────────────────────
echo "── Step 2: Route Status Codes (must all be 200) ──"

# Public routes (no auth needed — SPA returns 200 for all client routes)
PUBLIC_ROUTES=(
  "/"
  "/login"
  "/signup"
  "/library"
  "/calculator"
  "/quiz"
  "/stacks"
  "/lab-guide"
  "/guide"
  "/pricing"
  "/table"
  "/sources"
  "/community"
  "/about"
  "/contact"
  "/transparency"
  "/faq"
  "/privacy"
  "/terms"
  "/glossary"
  "/interactions"
  "/compare"
  "/blog"
)

# Routes that redirect (should return 200 after redirect or 301/302)
REDIRECT_ROUTES=(
  "/reviews"
  "/dose-calculator"
)

# Protected routes (will redirect to /login, so we check the SPA serves 200)
PROTECTED_ROUTES=(
  "/coach"
  "/account"
  "/dashboard"
  "/tracker"
  "/admin"
)

# Dynamic routes (test with known slugs)
DYNAMIC_ROUTES=(
  "/peptide/bpc-157"
  "/peptide/semaglutide"
  "/peptide/kisspeptin-10"
)

check_route() {
  local route="$1"
  local url="${SITE}${route}"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 15 "$url" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    pass "$route → $status"
  elif [ "$status" = "301" ] || [ "$status" = "302" ]; then
    warn "$route → $status (redirect)"
  else
    fail "$route → $status"
  fi
}

for route in "${PUBLIC_ROUTES[@]}"; do
  check_route "$route"
done

echo ""
echo "── Redirect routes ──"
for route in "${REDIRECT_ROUTES[@]}"; do
  check_route "$route"
done

echo ""
echo "── Protected routes (SPA serves shell) ──"
for route in "${PROTECTED_ROUTES[@]}"; do
  check_route "$route"
done

echo ""
echo "── Dynamic routes ──"
for route in "${DYNAMIC_ROUTES[@]}"; do
  check_route "$route"
done

echo ""

# ─── 3. Content checks ──────────────────────────────────
echo "── Step 3: Content Validation ──"

# Check homepage has expected content
HOMEPAGE=$(curl -s -L --max-time 15 "$SITE" 2>/dev/null)
if echo "$HOMEPAGE" | grep -q "pptides"; then
  pass "Homepage contains 'pptides' branding"
else
  fail "Homepage missing 'pptides' branding"
fi

if echo "$HOMEPAGE" | grep -qi "verdix"; then
  fail "Homepage contains Verdix branding (MUST NOT be on website)"
else
  pass "No Verdix branding on homepage"
fi

# Check pricing page has SAR
PRICING=$(curl -s -L --max-time 15 "${SITE}/pricing" 2>/dev/null)
if echo "$PRICING" | grep -q "ر.س"; then
  pass "Pricing page contains SAR currency"
else
  warn "Pricing page may not contain SAR (could be JS-rendered)"
fi

echo ""

# ─── 4. Email verification ──────────────────────────────
echo "── Step 4: Email Verification ──"
# Scan built output for email addresses
if [ -d "dist" ]; then
  VERDIX_EMAILS=$(grep -r "verdix" dist/ 2>/dev/null | grep -v '.map' || true)
  if [ -n "$VERDIX_EMAILS" ]; then
    fail "Verdix reference found in built output!"
    echo "$VERDIX_EMAILS" | head -5 | sed 's/^/  /'
  else
    pass "No Verdix references in built output"
  fi

  # Check support email is correct
  if grep -r "contact@pptides.com" dist/ --include='*.js' --include='*.html' -q 2>/dev/null; then
    pass "Support email (contact@pptides.com) present in build"
  else
    warn "Support email not found in built JS (may be in constants)"
  fi
else
  warn "dist/ not found — skipping built output checks"
fi

echo ""

# ─── 5. Console error check (basic) ─────────────────────
echo "── Step 5: Basic Error Checks ──"

# Check for common error patterns in built JS
if [ -d "dist" ]; then
  # Check for hardcoded localhost references
  LOCALHOST=$(grep -r "localhost" dist/ --include='*.js' --include='*.html' 2>/dev/null | grep -v '.map' | grep -v 'sourceMap' || true)
  if [ -n "$LOCALHOST" ]; then
    warn "localhost reference found in build (may be dev artifact)"
  else
    pass "No localhost references in build"
  fi

  # Check for console.log in production
  CONSOLE_LOGS=$(grep -c "console\.log" dist/assets/*.js 2>/dev/null || echo "0")
  if [ "$CONSOLE_LOGS" -gt 10 ]; then
    warn "Found $CONSOLE_LOGS console.log calls in production JS"
  else
    pass "Console.log count acceptable ($CONSOLE_LOGS)"
  fi
fi

echo ""

# ─── 6. Dark mode check ─────────────────────────────────
echo "── Step 6: Dark Mode Verification ──"
# Check that dark mode classes exist in the build
if [ -d "dist" ]; then
  DARK_CLASSES=$(grep -c "dark:" dist/assets/*.css 2>/dev/null || echo "0")
  if [ "$DARK_CLASSES" -gt 50 ]; then
    pass "Dark mode CSS classes present ($DARK_CLASSES rules)"
  else
    fail "Insufficient dark mode CSS rules ($DARK_CLASSES found, expected 50+)"
  fi
else
  warn "dist/ not found — skipping dark mode check"
fi

echo ""

# ─── 7. Mobile viewport check ───────────────────────────
echo "── Step 7: Mobile Viewport Check ──"
# Check for viewport meta tag
if echo "$HOMEPAGE" | grep -q 'viewport'; then
  pass "Viewport meta tag present"
else
  fail "Missing viewport meta tag"
fi

# Check for overflow-hidden or overflow-x-hidden in CSS
if [ -d "dist" ]; then
  if grep -q "overflow" dist/assets/*.css 2>/dev/null; then
    pass "Overflow CSS rules present"
  else
    warn "No overflow CSS rules found (check for horizontal scroll issues)"
  fi

  # Check for fixed pixel widths that could cause overflow
  FIXED_PX=$(grep -oE 'width:[0-9]{4,}px' dist/assets/*.css 2>/dev/null | wc -l || echo "0")
  if [ "$FIXED_PX" -gt 0 ]; then
    warn "Found $FIXED_PX fixed pixel widths >999px in CSS (potential mobile overflow)"
  else
    pass "No large fixed pixel widths in CSS"
  fi
fi

echo ""

# ─── 8. RTL check ────────────────────────────────────────
echo "── Step 8: RTL Check ──"
if echo "$HOMEPAGE" | grep -q 'dir="rtl"'; then
  pass "RTL direction set on page"
else
  warn "RTL dir attribute not found in initial HTML (may be set by JS)"
fi

if echo "$HOMEPAGE" | grep -q 'lang="ar"'; then
  pass "Arabic language tag present"
else
  warn "Arabic lang tag not found in initial HTML"
fi

echo ""

# ─── Summary ─────────────────────────────────────────────
echo "═══════════════════════════════════════════"
echo -e "  Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${WARN} warnings${NC}"
echo "═══════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}DEPLOY BLOCKED — Fix failures before deploying.${NC}"
  exit 1
else
  echo -e "${GREEN}All checks passed. Safe to deploy.${NC}"
  exit 0
fi
