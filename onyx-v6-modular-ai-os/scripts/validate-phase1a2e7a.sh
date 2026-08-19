#!/usr/bin/env bash
set -euo pipefail
echo "[1/10] E.7A contracts";grep -Fq 'LIVE_APPROVED' packages/automation-plan-builder/src/live-github-contracts.ts;grep -Fq 'remotePushed:false' packages/automation-plan-builder/src/live-github-service.ts
echo "[2/10] repository scope";grep -Fq 'Repository identity mismatch' packages/automation-plan-builder/src/live-github-policy.ts;grep -Fq 'Git remote does not match approved repository' packages/automation-plan-builder/src/live-github-policy.ts
echo "[3/10] live approval";grep -Fq 'Live approval authority is not Rahul Kumar' packages/automation-plan-builder/src/live-github-policy.ts;grep -Fq 'Live approval scope hash mismatch' packages/automation-plan-builder/src/live-github-policy.ts
echo "[4/10] command policy";grep -Fq 'gh","pr","create","--draft' packages/automation-plan-builder/src/live-command-policy.ts;grep -Fq -- '--force' packages/automation-plan-builder/src/live-command-policy.ts
echo "[5/10] package typecheck";pnpm --filter @onyx/automation-plan-builder typecheck
echo "[6/10] package tests";pnpm --filter @onyx/automation-plan-builder test
echo "[7/10] E.1 through E.6 regression";bash scripts/validate-phase1a2e6.sh
echo "[8/10] dry-run live adapter demo";pnpm --filter @onyx/automation-plan-builder exec tsx src/live-github-demo.ts >/tmp/onyx-e7a-demo.json;grep -Fq '"remoteWritesPerformed": false' /tmp/onyx-e7a-demo.json;grep -Fq coolscorpiorahul /tmp/onyx-e7a-demo.json
echo "[9/10] no live adapter implementation";if grep -E 'child_process|execSync|spawnSync|octokit|fetch\(' packages/automation-plan-builder/src/live-github-service.ts packages/automation-plan-builder/src/live-github-demo.ts;then exit 1;fi
echo "[10/10] whitespace";git diff --check
echo "[PASS] Phase 1A.2E.7A Repository-Scoped Live GitHub Adapter Foundation validated"