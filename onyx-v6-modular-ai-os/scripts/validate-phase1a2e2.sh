#!/usr/bin/env bash
set -euo pipefail
echo "[1/9] E.2 contracts";grep -Fq 'ApprovedPlanRef' packages/automation-plan-builder/src/execution-contracts.ts;grep -Fq 'scopeHash' packages/automation-plan-builder/src/execution-evaluator.ts
echo "[2/9] approval and branch gates";grep -Fq 'Approval authority is not Rahul Kumar' packages/automation-plan-builder/src/execution-evaluator.ts;grep -Fq 'Working tree must be clean' packages/automation-plan-builder/src/execution-evaluator.ts;grep -Eq 'automation\\?/issue-' packages/automation-plan-builder/src/execution-evaluator.ts
echo "[3/9] command and file boundaries";grep -Fq 'allowedCommandPatterns' packages/automation-plan-builder/src/execution-policy.ts;grep -Fq 'prohibitedFragments' packages/automation-plan-builder/src/execution-policy.ts;grep -Fq 'validateFileBoundary' packages/automation-plan-builder/src/execution-policy.ts
echo "[4/9] package typecheck";pnpm --filter @onyx/automation-plan-builder typecheck
echo "[5/9] package tests";pnpm --filter @onyx/automation-plan-builder test
echo "[6/9] E.1 demo";pnpm --filter @onyx/automation-plan-builder demo >/tmp/onyx-e1-demo.json;grep -Fq AWAITING_SCOPE_APPROVAL /tmp/onyx-e1-demo.json
echo "[7/9] automation regressions";pnpm --filter @onyx/automation-foundation test;pnpm --filter @onyx/github-automation test
echo "[8/9] Command Center";pnpm --filter @onyx/command-center typecheck;pnpm --filter @onyx/command-center build
echo "[9/9] safety and whitespace";grep -Fq 'gh pr merge' packages/automation-plan-builder/src/execution-policy.ts
grep -Fq 'netlify deploy' packages/automation-plan-builder/src/execution-policy.ts
grep -Fq 'git push origin main' packages/automation-plan-builder/src/execution-policy.ts
if grep -E 'gh pr merge|netlify deploy --prod|git push origin main'   packages/automation-plan-builder/src/execution-evaluator.ts   packages/automation-plan-builder/src/execution-demo.ts; then
  echo "[FAIL] Executable E.2 code contains a prohibited operation"
  exit 1
fi
git diff --check
echo "[PASS] Phase 1A.2E.2 Approval-Gated Isolated Branch and Bounded Workspace Executor validated"