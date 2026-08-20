#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

src=packages/phase1a4b-branch-bridge/src/index.ts
tests=packages/phase1a4b-branch-bridge/tests/branch-bridge.test.ts

echo "[1/12] required files"
test -f packages/phase1a4b-branch-bridge/package.json
test -f packages/phase1a4b-branch-bridge/tsconfig.json
test -f "$src"
test -f "$tests"
test -f docs/phase1a4/phase1a4b-isolated-branch-bridge.md

echo "[2/12] states and capability"
for state in AWAITING_BRANCH_APPROVAL APPROVED_FOR_BRANCH_CREATION BRANCH_CREATION_IN_PROGRESS BRANCH_READY_LOCAL BRANCH_CREATION_FAILED_SAFE BRANCH_RECONCILIATION_REQUIRED; do grep -Fq "$state" "$src"; done
grep -Fq 'CREATE_ISOLATED_BRANCH' "$src"

echo "[3/12] governed input and approval bindings"
for value in coolscorpiorahul test831495/onyx-alpha1-transfer 'BRANCH_ISSUE_NUMBER = 7' 'Phase 1A.4A Live Smoke Test' feature/phase1a4a-github-issue-bridge automation/issue-7-phase1a4b-isolated-branch-smoke VALIDATED_PREDECESSOR_COMMIT scopeHash expiresAt idempotencyKey consumed; do grep -Fq "$value" "$src"; done

echo "[4/12] negative security tests"
for value in 'wrong actor' 'wrong repository' 'wrong issue' 'closed issue' 'wrong base branch' 'base-commit mismatch' 'scope-hash mismatch' 'expired approval' 'wrong capability' 'invalid branch name' 'protected branch' 'dirty working tree' 'detached HEAD' 'incompatible existing branch'; do grep -Fq "$value" "$tests"; done

echo "[5/12] bridge typecheck and focused tests"
pnpm --filter @onyx/phase1a4b-branch-bridge typecheck
pnpm --filter @onyx/phase1a4b-branch-bridge test

echo "[6/12] GitHub automation checks"
pnpm --filter @onyx/github-automation typecheck
pnpm --filter @onyx/github-automation test

echo "[7/12] automation plan-builder checks"
pnpm --filter @onyx/automation-plan-builder typecheck
pnpm --filter @onyx/automation-plan-builder test

echo "[8/12] Phase 1A.4A regression"
bash scripts/validate-phase1a4a.sh

echo "[9/12] Phase 1A.3 E.10 regression"
bash scripts/validate-phase1a3e10.sh

echo "[10/12] shell syntax and prohibited operations"
bash -n scripts/validate-phase1a4b.sh
if grep -REn 'git push|gh issue create|gh pr create|gh pr merge|netlify deploy|force-push|branch deletion|git reset --hard|git clean -fd|child_process|execSync|spawnSync' packages/phase1a4b-branch-bridge/src packages/phase1a4b-branch-bridge/tests; then
  echo "Prohibited operation found in Phase 1A.4B implementation."
  exit 1
fi

echo "[11/12] whitespace and safety flags"
git diff --check
for value in remoteBranchPushed: false draftPrCreated: false mergeAllowed: false productionDeployAllowed: false; do grep -Fq "$value" "$src"; done

echo "[12/12] prohibited-operation and branch safety assertions"
grep -Fq 'protected branch' "$tests"
grep -Fq 'dirty working tree' "$tests"
grep -Fq 'BRANCH_RECONCILIATION_REQUIRED' "$tests"
grep -Fq 'remoteBranchPushed' "$tests"

echo "[PASS] Phase 1A.4B isolated branch bridge validated"