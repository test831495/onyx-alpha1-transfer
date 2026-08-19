#!/usr/bin/env bash
set -euo pipefail
echo "[1/5] dashboard contract scan"; grep -q "Execute unavailable" apps/command-center/src/components/AutomationDashboard.tsx
grep -q "Approve locally" apps/command-center/src/components/AutomationDashboard.tsx
echo "[2/5] command center typecheck"; pnpm --filter @onyx/command-center typecheck
echo "[3/5] command center build"; pnpm --filter @onyx/command-center build
echo "[4/5] automation regressions"; bash scripts/validate-phase1a2c.sh
echo "[5/5] mutation scan"; if grep -R -E 'gh issue create|gh pr create|gh pr merge|netlify deploy' apps/command-center/src/components/AutomationDashboard.tsx apps/command-center/src/automationDashboardBootstrap.tsx; then echo "[FAIL] UI contains live command";exit 1;fi
echo "[PASS] Phase 1A.2D Automation Dashboard validation completed"
