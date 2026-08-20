#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

echo "[1/10] required files"
test -f packages/phase1a4a-issue-bridge/package.json
test -f packages/phase1a4a-issue-bridge/src/index.ts
test -f packages/phase1a4a-issue-bridge/tests/issue-bridge.test.ts
test -f docs/phase1a4/phase1a4a-github-issue-bridge.md

echo "[2/10] states and capability"
grep -Fq 'AWAITING_ISSUE_APPROVAL' packages/phase1a4a-issue-bridge/src/index.ts
grep -Fq 'APPROVED_FOR_ISSUE_CREATION' packages/phase1a4a-issue-bridge/src/index.ts
grep -Fq 'ISSUE_CREATION_IN_PROGRESS' packages/phase1a4a-issue-bridge/src/index.ts
grep -Fq 'ISSUE_CREATED' packages/phase1a4a-issue-bridge/src/index.ts
grep -Fq 'CREATE_GITHUB_ISSUE' packages/phase1a4a-issue-bridge/src/index.ts

echo "[3/10] approval, scope, repository, and idempotency validation"
grep -Fq 'DRY_RUN_READY' packages/phase1a4a-issue-bridge/src/index.ts
grep -Fq 'Rahul Kumar' packages/phase1a4a-issue-bridge/src/index.ts
grep -Fq 'test831495/onyx-alpha1-transfer' packages/phase1a4a-issue-bridge/src/index.ts
grep -Fq 'scopeHash' packages/phase1a4a-issue-bridge/src/index.ts
grep -Fq 'idempotencyKey' packages/phase1a4a-issue-bridge/src/index.ts

echo "[4/10] negative security tests"
grep -Fq 'wrong actor' packages/phase1a4a-issue-bridge/tests/issue-bridge.test.ts
grep -Fq 'wrong repository' packages/phase1a4a-issue-bridge/tests/issue-bridge.test.ts
grep -Fq 'expired approval' packages/phase1a4a-issue-bridge/tests/issue-bridge.test.ts
grep -Fq 'ISSUE_RECONCILIATION_REQUIRED' packages/phase1a4a-issue-bridge/tests/issue-bridge.test.ts

echo "[5/10] bridge typecheck"
pnpm --filter @onyx/phase1a4a-issue-bridge typecheck

echo "[6/10] focused bridge tests"
pnpm --filter @onyx/phase1a4a-issue-bridge test

echo "[7/10] GitHub automation checks"
pnpm --filter @onyx/github-automation typecheck
pnpm --filter @onyx/github-automation test

echo "[8/10] automation plan builder checks"
pnpm --filter @onyx/automation-plan-builder typecheck
pnpm --filter @onyx/automation-plan-builder test

echo "[9/10] E.10 regression"
pnpm --filter @onyx/command-center exec vitest run src/automationOrchestrationService.e10.test.ts
bash scripts/validate-phase1a3e10.sh

echo "[10/10] whitespace and prohibited operation scan"
git diff --check
if grep -REn 'gh pr merge|netlify deploy|git push|force-push|git reset --hard|git clean -fd|MERGE_PULL_REQUEST|PRODUCTION_DEPLOYMENT|LIVE_NETLIFY_UPDATE|SECRET_CHANGE|PERMISSION_CHANGE|BRANCH_PROTECTION_CHANGE|FORCE_PUSH|DESTRUCTIVE_GIT_OPERATION' packages/phase1a4a-issue-bridge/src packages/phase1a4a-issue-bridge/tests; then
  echo "Prohibited operation found in Phase 1A.4A implementation."
  exit 1
fi

echo "[PASS] Phase 1A.4A GitHub issue bridge validated"
