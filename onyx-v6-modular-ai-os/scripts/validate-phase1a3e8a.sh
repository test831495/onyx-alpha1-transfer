#!/usr/bin/env bash
set -euo pipefail
echo "[1/10] E.8A UI contracts";grep -Fq 'UiSnapshot' apps/command-center/src/automationDashboardContracts.ts;grep -Fq 'E5_DASHBOARD_SERVICE' apps/command-center/src/automationDashboardData.ts
echo "[2/10] React-owned tabs";for x in Overview Queue Approvals Validation Evidence 'Draft PRs' History;do grep -Fq "$x" apps/command-center/src/components/AutomationDashboard.tsx;done
echo "[3/10] no merge or production";grep -Fq 'mergeAllowed:false' apps/command-center/src/automationDashboardData.ts;grep -Fq 'productionDeployAllowed:false' apps/command-center/src/automationDashboardData.ts;grep -Fq 'Execute production unavailable' apps/command-center/src/components/AutomationDashboard.tsx
echo "[4/10] Issue #5 and Draft PR #6 projection";grep -Fq 'issueNumber:5' apps/command-center/src/automationDashboardData.ts;grep -Fq 'pull/6' apps/command-center/src/automationDashboardData.ts;grep -Fq 'target="_blank"' apps/command-center/src/components/AutomationDashboard.tsx apps/command-center/src/components/AutomationDraftPrReview.tsx
echo "[5/10] Command Center typecheck";pnpm --filter @onyx/command-center typecheck
echo "[6/10] Command Center build";pnpm --filter @onyx/command-center build
echo "[7/10] automation package regression";pnpm --filter @onyx/automation-plan-builder test
echo "[8/10] E.7A regression";bash scripts/validate-phase1a2e7a.sh
echo "[9/10] prohibited executable scan";if grep -E 'gh pr merge|netlify deploy --prod|git push origin main|child_process|execSync|spawnSync' apps/command-center/src/components/AutomationDashboard.tsx apps/command-center/src/automationDashboardData.ts apps/command-center/src/automationDashboardHook.ts;then exit 1;fi
echo "[10/10] whitespace";git diff --check
echo "[PASS] Phase 1A.3 E.8A ONYX Automation Center UI Integration validated"