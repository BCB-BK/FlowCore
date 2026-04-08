#!/bin/bash
set -e

echo "=== Post-Merge Setup ==="

echo "[1/5] Installing dependencies..."
pnpm install --frozen-lockfile

echo "[2/5] Pushing DB schema..."
pnpm --filter db push

echo "[3/5] Applying triggers..."
npx tsx lib/db/src/triggers/apply-triggers.ts

echo "[4/5] Seeding AI field profiles..."
npx tsx lib/db/src/seed-ai-field-profiles.ts

echo "[5/5] Running API client codegen..."
pnpm --filter @workspace/api-client-react run codegen 2>/dev/null || echo "  (codegen skipped — API server not running)"

echo ""
echo "=== Post-Merge Validation (non-blocking) ==="

VALIDATION_FAILURES=0

echo "[CHECK 1/3] TypeScript check (api-server)..."
if pnpm --filter @workspace/api-server exec tsc --noEmit 2>&1; then
  echo "  ✓ API server types OK"
else
  echo "  ⚠ API server has type errors (see above)"
  VALIDATION_FAILURES=$((VALIDATION_FAILURES + 1))
fi

echo "[CHECK 2/3] TypeScript check (wiki-frontend)..."
if pnpm --filter @workspace/wiki-frontend exec tsc --noEmit 2>&1; then
  echo "  ✓ Frontend types OK"
else
  echo "  ⚠ Frontend has type errors (see above)"
  VALIDATION_FAILURES=$((VALIDATION_FAILURES + 1))
fi

echo "[CHECK 3/3] Code quality validators..."
if pnpm --filter @workspace/scripts run task-completion-audit 2>&1; then
  echo "  ✓ Code quality OK"
else
  echo "  ⚠ Code quality issues found (see above)"
  VALIDATION_FAILURES=$((VALIDATION_FAILURES + 1))
fi

echo ""
if [ "$VALIDATION_FAILURES" -gt 0 ]; then
  echo "=== Post-Merge Complete (${VALIDATION_FAILURES} validation warning(s)) ==="
else
  echo "=== Post-Merge Complete (all checks passed) ==="
fi
