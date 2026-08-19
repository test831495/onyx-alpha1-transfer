#!/usr/bin/env bash
set -euo pipefail
echo "[1/10] E.4 contracts";grep -Fq 'DraftPrPackage' packages/automation-plan-builder/src/draft-pr-contracts.ts;grep -Fq 'EVIDENCE_READY' packages/automation-plan-builder/src/draft-pr-builder.ts
echo "[2/10] draft-only governance";grep -Fq 'draft:true' packages/automation-plan-builder/src/draft-pr-builder.ts;grep -Fq 'mergeAllowed:false' packages/automation-plan-builder/src/draft-pr-builder.ts;grep -Fq 'productionDeployAllowed:false' packages/automation-plan-builder/src/draft-pr-builder.ts
echo "[3/10] approval and idempotency";grep -Fq 'Approval authority is not Rahul Kumar' packages/automation-plan-builder/src/draft-pr-policy.ts;grep -Fq 'idempotencyKey' packages/automation-plan-builder/src/draft-pr-creator.ts
echo "[4/10] package typecheck";pnpm --filter @onyx/automation-plan-builder typecheck
echo "[5/10] package tests";pnpm --filter @onyx/automation-plan-builder test
echo "[6/10] E.1 to E.3 regression";bash scripts/validate-phase1a2e3.sh
echo "[7/10] Draft PR package demo";pnpm --filter @onyx/automation-plan-builder exec tsx src/draft-pr-demo.ts >/tmp/onyx-e4-demo.json;grep -Fq AWAITING_DRAFT_PR_APPROVAL /tmp/onyx-e4-demo.json;grep -Fq '"draft": true' /tmp/onyx-e4-demo.json
echo "[8/10] no-merge and no-production policy";grep -Fq 'Merge and production deployment are not authorized' packages/automation-plan-builder/src/draft-pr-builder.ts
echo "[9/10] executable safety scan";if grep -E 'gh pr merge|netlify deploy --prod|git push origin main' packages/automation-plan-builder/src/draft-pr-creator.ts packages/automation-plan-builder/src/draft-pr-demo.ts;then exit 1;fi
echo "[10/10] whitespace";git diff --check
echo "[PASS] Phase 1A.2E.4 Evidence Package and Approval-Gated Draft PR Builder validated"