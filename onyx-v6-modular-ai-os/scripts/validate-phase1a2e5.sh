#!/usr/bin/env bash
set -euo pipefail
echo "[1/10] E.5 contracts";grep -Fq 'DashboardJobState' packages/automation-plan-builder/src/dashboard-contracts.ts;grep -Fq 'AWAITING_DRAFT_PR_APPROVAL' packages/automation-plan-builder/src/dashboard-contracts.ts
echo "[2/10] state projection";grep -Fq 'projectSnapshot' packages/automation-plan-builder/src/dashboard-projector.ts;grep -Fq 'availableActions' packages/automation-plan-builder/src/dashboard-projector.ts
echo "[3/10] approval policy";grep -Fq 'Sensitive dashboard action requires Rahul Kumar' packages/automation-plan-builder/src/dashboard-policy.ts;grep -Fq 'meaningful reason' packages/automation-plan-builder/src/dashboard-policy.ts
echo "[4/10] no merge or production";grep -Fq 'productionDeployAllowed:false' packages/automation-plan-builder/src/dashboard-projector.ts;grep -Fq 'mergeAllowed:false' packages/automation-plan-builder/src/dashboard-projector.ts
echo "[5/10] package typecheck";pnpm --filter @onyx/automation-plan-builder typecheck
echo "[6/10] package tests";pnpm --filter @onyx/automation-plan-builder test
echo "[7/10] E.1 through E.4 regression";bash scripts/validate-phase1a2e4.sh
echo "[8/10] dashboard snapshot demo";pnpm --filter @onyx/automation-plan-builder exec tsx src/dashboard-demo.ts >/tmp/onyx-e5-dashboard.json;grep -Fq AWAITING_DRAFT_PR_APPROVAL /tmp/onyx-e5-dashboard.json;grep -Fq '"mergeAllowed": false' /tmp/onyx-e5-dashboard.json
echo "[9/10] executable safety";if grep -E 'gh pr merge|netlify deploy --prod|git push origin main' packages/automation-plan-builder/src/dashboard-projector.ts packages/automation-plan-builder/src/dashboard-store.ts packages/automation-plan-builder/src/dashboard-policy.ts;then exit 1;fi
echo "[10/10] whitespace";git diff --check
echo "[PASS] Phase 1A.2E.5 Live Automation Dashboard Job Integration foundation validated"