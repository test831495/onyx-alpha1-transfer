#!/usr/bin/env bash
set -euo pipefail
echo "[1/10] E.6 contracts";grep -Fq 'SMOKE_PASSED' packages/automation-plan-builder/src/smoke-contracts.ts;grep -Fq 'remoteWritesPerformed:false' packages/automation-plan-builder/src/smoke-runner.ts
echo "[2/10] E.1 to E.5 connections";grep -Fq 'buildPlan' packages/automation-plan-builder/src/smoke-runner.ts;grep -Fq 'createApprovedBranch' packages/automation-plan-builder/src/smoke-runner.ts;grep -Fq 'orchestrate' packages/automation-plan-builder/src/smoke-runner.ts;grep -Fq 'createApprovedDraftPr' packages/automation-plan-builder/src/smoke-runner.ts;grep -Fq 'DashboardService' packages/automation-plan-builder/src/smoke-runner.ts
echo "[3/10] no merge or production";grep -Fq 'mergeAllowed:false' packages/automation-plan-builder/src/smoke-runner.ts;grep -Fq 'productionDeployAllowed:false' packages/automation-plan-builder/src/smoke-runner.ts
echo "[4/10] package typecheck";pnpm --filter @onyx/automation-plan-builder typecheck
echo "[5/10] package tests";pnpm --filter @onyx/automation-plan-builder test
echo "[6/10] E.1 through E.5 regression";bash scripts/validate-phase1a2e5.sh
echo "[7/10] controlled end-to-end smoke";pnpm --filter @onyx/automation-plan-builder exec tsx src/smoke-demo.ts >/tmp/onyx-e6-smoke.json;grep -Fq SMOKE_PASSED /tmp/onyx-e6-smoke.json;grep -Fq '"remoteWritesPerformed": false' /tmp/onyx-e6-smoke.json;grep -Fq '"mergeAllowed": false' /tmp/onyx-e6-smoke.json;grep -Fq '"productionDeployAllowed": false' /tmp/onyx-e6-smoke.json
echo "[8/10] mock-only adapter assurance";grep -Fq 'example.invalid' packages/automation-plan-builder/src/smoke-demo.ts;grep -Fq 'createBranch:async()=>{}' packages/automation-plan-builder/src/smoke-demo.ts
echo "[9/10] executable safety";grep -Fq 'git switch -c' packages/automation-plan-builder/src/smoke-runner.ts
if grep -E 'gh pr merge|netlify deploy --prod|git push origin main|child_process|execSync|spawnSync'   packages/automation-plan-builder/src/smoke-runner.ts   packages/automation-plan-builder/src/smoke-demo.ts; then
  echo "[FAIL] E.6 contains prohibited operation or direct shell execution"
  exit 1
fi
echo "[10/10] whitespace";git diff --check
echo "[PASS] Phase 1A.2E.6 Controlled End-to-End Issue-to-Draft-PR Smoke Test validated"